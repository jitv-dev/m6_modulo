const express = require('express');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { Jimp } = require('jimp');
const { leerArchivo, escribirArchivo, listarContactos, borrarContacto, actualizarContacto, agregarContacto } = require("./fileUtils")

const app = express()
const PORT = 3000

const helpers = {
    year: new Date().getFullYear()
}

app.engine("handlebars", exphbs.engine({
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers
}))
app.set("view engine", "handlebars")
app.set("views", path.join(__dirname, "views"))

app.use(methodOverride('_method'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))
app.use(fileUpload())

app.use((req, res, next) => {
    if (req.query.q) {
        res.locals.busqueda = req.query.q
    } else {
        res.locals.busqueda = ''
    }
    next()
})

app.get("/", async (req, res) => {
        res.redirect("/home")
})

app.get("/home", async (req, res) => {
    try {
        const contactos = await listarContactos()
        res.render("home", {
            titulo: "Inicio",
            contactos,
            busqueda: ''
        })
    } catch (error) {
        console.error("Ha ocurrido un error", error)
    }
})

app.get("/contactos", async (req, res) => {
    try {
        const { q } = req.query

        let contactos = await listarContactos()

        if (q) {
            const busqueda = q.toLowerCase()
            contactos = contactos.filter(contacto =>
                contacto.nombre.toLowerCase().includes(busqueda) ||
                contacto.region.toLowerCase().includes(busqueda) ||
                contacto.comuna.toLowerCase().includes(busqueda) ||
                contacto.telefono.toLowerCase().includes(busqueda) ||
                contacto.correo.toLowerCase().includes(busqueda)
            )
        }

        res.render("contactos", {
            titulo: "Lista de contactos",
            contactos,
            busqueda: q || ''
        })
    } catch (error) {
        console.error("Ha ocurrido un error", error)
    }

})

app.get("/contactos/agregar", async (req, res) => {
    try {
        res.render("agregar", {
            titulo: "Agregar nuevo contacto",
            busqueda: ''
        })
    } catch (error) {
        console.error("Ha ocurrido un error", error)
    }

})

app.get("/about", async (req, res) => {
    try {
        res.render("about", {
            titulo: "Sobre la APP",
            busqueda: ''
        })
    } catch (error) {
        console.error("Ha ocurrido un error", error)
    }
})

app.post("/contactos", async (req, res) => {
    try {
        const { nombre, region, comuna, telefono, correo } = req.body
        if (!req.files || !req.files.foto) {
            return res.status(400).send("No se subió ninguna foto")
        }
        const foto = req.files.foto
        const nombreArchivo = `${nombre.trim().toLowerCase()}_${Date.now() + path.extname(foto.name)}`
        const rutaGuardar = path.join(__dirname, "public", "img", nombreArchivo)
        const imagen = await Jimp.read(foto.data)
        await imagen.resize({ w: 300 }).write(rutaGuardar)

        const nuevoContacto = {
            id: Date.now(),
            nombre,
            region,
            comuna,
            telefono,
            correo,
            foto: nombreArchivo
        }
        await agregarContacto(nuevoContacto)

        console.log(nuevoContacto)
        res.redirect("/contactos")
    } catch (error) {
        console.error("Error en POST", error)
    }

})

app.delete("/contactos/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const contactos = await listarContactos()
        const contacto = contactos.find(c => c.id === id)
        const rutaImagen = path.join(__dirname, "public", "img", contacto.foto)
        fs.unlink(rutaImagen, (err) => {
            if (err) {
                console.error("No se pudo eliminar la imagen", err)
            } else {
                console.log(`Imagen de ${contacto.nombre} borrada exitosamente`)
            }
        })

        await borrarContacto(id)
        res.redirect("/contactos")
    } catch (error) {
        console.error("Error en DELETE", error)
    }

})

app.put("/contactos/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, region, comuna, telefono, correo } = req.body

        // Listo los contactos y filtro por el id
        const contactos = await listarContactos()
        const contactoExistente = contactos.find(c => c.id === id)

        if (!contactoExistente) {
            console.error("Contacto no encontrado para actualizar")
            return res.redirect("/contactos")
        }

        // La foto previa no se borra porque le di un valor a nombreArchivo desde el inicio
        let nombreArchivo = contactoExistente.foto

        // Si adjunto una foto, se ejecuta el if, creando una nueva imagen en la carpeta img
        if (req.files && req.files.foto) {
            const foto = req.files.foto
            const nuevaFotoNombre = `${nombre.trim().toLowerCase()}_${Date.now() + path.extname(foto.name)}`
            const rutaGuardarNueva = path.join(__dirname, "public", "img", nuevaFotoNombre)

            const imagen = await Jimp.read(foto.data)
            await imagen.resize({ w: 300 }).write(rutaGuardarNueva)

            // Si el contacto tenia una foto anterior esta se borra con unlink
            if (contactoExistente.foto) {
                const rutaImagenVieja = path.join(__dirname, "public", "img", contactoExistente.foto)
                fs.unlink(rutaImagenVieja, (err) => {
                    if (err) {
                        console.error("No se pudo eliminar la imagen anterior:", err)
                    } else {
                        console.log("Imagen anterior eliminada:", contactoExistente.foto)
                    }
                })
            }

            // Si subi la nueva foto cambio el nombreArchivo por la nueva foto
            nombreArchivo = nuevaFotoNombre
        }

        const nuevosDatos = {
            nombre,
            region,
            comuna,
            telefono,
            correo,
            foto: nombreArchivo
        }

        await actualizarContacto(id, nuevosDatos)
        res.redirect("/contactos")
    } catch (error) {
        console.error("Error en PUT:", error)
    }
})

// Queria probar si funcionaba el error
app.get("/test-error", (req, res, next) => {
    next(new Error("Prueba error 500"))
})

app.use((err, req, res, next) => {
    console.error("Error detectado:", err.message)
    res.status(500).render("500", {
        titulo: "Error del servidor",
        mensaje: "Ha ocurrido un error interno. Por favor intenta nuevamente."
    })
})

app.use((req, res) => {
    res.status(404).render("404", {
        titulo: "Error 404 - Página no encontrada",
        mensaje: "La página que buscas no existe."
    })
})

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT} `)
})