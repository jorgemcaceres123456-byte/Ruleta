# Gíralo

Aplicación web para crear ruletas personalizadas. Está en español, funciona en móvil y escritorio, y guarda las ruletas y el tema en el navegador, sin cuentas ni servidor de datos.

## Uso

- Selecciona una ruleta en **Mis ruletas** o crea otra con **Nueva ruleta**. En **···** puedes cambiar su nombre o eliminarla.
- Escribe una opción y pulsa **+** o **Enter**. Puedes editar el nombre y el peso de cada opción en la lista. No hay un límite de opciones impuesto por la app.
- Con todos los pesos iguales, las opciones tienen la misma probabilidad. Cada segmento ocupa su peso dividido por el total; por ejemplo, con pesos 3 y 1, las probabilidades son 75 % y 25 %. Un peso 0 excluye la opción del giro sin borrarla.
- Pulsa **Girar ruleta**, toca el centro o usa **Espacio** fuera de los campos de edición. El texto de arriba sigue al puntero y muestra el resultado final. El sorteo usa la fuente aleatoria del navegador (`crypto.getRandomValues`).

## Desarrollo

Usa Node.js 22 LTS (22.12 o posterior).

```sh
npm ci
npm run dev
npm test
npm run build
```

La compilación estática se genera en `dist/`.

## Despliegue en Vercel

Conecta este repositorio de GitHub al proyecto de Vercel. La configuración de `vercel.json` selecciona Vite, instala las dependencias con `npm ci --include=dev`, compila con `npm run build` y publica la carpeta `dist`. Deja **Root Directory** en la raíz del repositorio (sin subcarpeta). No se necesitan variables de entorno.

Si ves un 404 en `/`, revisa en **Deployments** que estás abriendo un despliegue de un commit que contiene `index.html` y `vercel.json`. Volver a desplegar el commit inicial (que solo contiene el README) no publica Gíralo. El dominio de producción se actualiza con un despliegue de la rama de producción que tenga la app.
