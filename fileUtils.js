const fs = require('fs/promises');
const path = require('path');

const archivo = path.join(__dirname, 'data', 'contactos.json')

const leerArchivo = async (ruta) => {
    try {
        const contenido = await fs.readFile(ruta, "utf8")
        return JSON.parse(contenido)
    } catch (error) {
        console.error("Error al leer el archivo", error)
        return []
    }
}

const escribirArchivo = async (ruta, datos) => {
    await fs.writeFile(ruta, JSON.stringify(datos, null, 4))
}

const agregarContacto = async (contacto) => {
    const contactos = await leerArchivo(archivo)
    contactos.push(contacto)
    await escribirArchivo(archivo, contactos)
}

const listarContactos = async () => {
    return await leerArchivo(archivo)
}

const borrarContacto = async (id) => {
    const contactos = await leerArchivo(archivo)
    const contactosFiltrados = contactos.filter(contacto => contacto.id != id)
    await escribirArchivo(archivo, contactosFiltrados)
}

const actualizarContacto = async (id, nuevoContacto) => {
    const contactos = await leerArchivo(archivo)
    const contactoIndex = contactos.findIndex(contacto => contacto.id == id)

    if (contactoIndex === -1) {
        throw new Error ('Contacto no encontrado')
    }

    contactos[contactoIndex] = {...contactos[contactoIndex], ...nuevoContacto}
    await escribirArchivo(archivo, contactos)
}

module.exports = { leerArchivo, escribirArchivo, listarContactos, borrarContacto, actualizarContacto, agregarContacto }