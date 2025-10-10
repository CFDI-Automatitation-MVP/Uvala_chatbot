# Configuración del Logo para Emails en Brevo

## Pasos para subir el logo a Brevo:

### 1. Subir logo en Brevo Dashboard
1. Ve a tu dashboard de Brevo
2. Busca **"Templates"** o **"Content Library"**
3. Sube el logo negro: `public/uvala-black-log.svg` (mejor visibilidad en emails)
4. **Copia la URL que te da Brevo**

### 2. Actualizar el código con la URL

**Opción A: Variable de entorno (Recomendado)**
```bash
# En tu archivo .env.local
BREVO_LOGO_URL=https://img.mailjet.com/TU_CUENTA/uvala-logo.png
```

**Opción B: Editar directamente el código**
En el archivo: `src/lib/email/email-templates.ts`

Cambia la línea 237:
```typescript
// ANTES:
// LOGO_URL: 'https://img.mailjet.com/YOUR_ACCOUNT/uvala-logo.png',

// DESPUÉS (con tu URL real):
LOGO_URL: 'https://img.mailjet.com/TU_CUENTA_REAL/uvala-logo.png',
```

## URLs de ejemplo de Brevo:
- `https://img.mailjet.com/123456/uvala-logo.png`
- `https://img.sendinblue.com/123456/uvala-logo.png`

## Verificar que funciona:
1. Guarda los cambios
2. Reinicia el servidor: `npm run dev`
3. Envía un email de prueba
4. El logo debería aparecer en el email

## Resolución de problemas:
- Si el logo no aparece, verifica que la URL sea accesible públicamente
- Asegúrate de que el formato sea PNG, JPG o SVG
- El tamaño recomendado es 200x50px para mejor visualización