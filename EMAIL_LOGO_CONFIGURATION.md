# 📧 Configuración del Logo en Emails - SOLUCIÓN AUTOMÁTICA

## ✅ **YA ESTÁ IMPLEMENTADO** - Sin necesidad de crear 40 plantillas

El sistema ahora reemplaza automáticamente el logo en **TODOS** los emails sin necesidad de crear plantillas manuales en Brevo.

## 🔧 **Cómo configurar el logo:**

### **Opción 1: Variable de entorno (Recomendado)**
Agrega en tu archivo `.env.local`:

```bash
# Para usar un logo personalizado desde Brevo
BREVO_LOGO_URL=https://img.brevo.com/123456/uvala-black-log.svg

# O para usar cualquier URL externa
EMAIL_LOGO_URL=https://mi-cdn.com/uvala-logo.png

# URL de tu aplicación (para logos locales)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### **Opción 2: Logo local (Ya configurado)**
Si no configuras variables de entorno, usa automáticamente:
```
https://tu-dominio.com/uvala-black-log.svg
```

## 🎯 **Prioridad del sistema:**
1. `BREVO_LOGO_URL` (URL personalizada de Brevo)
2. `EMAIL_LOGO_URL` (URL externa personalizada)
3. `NEXT_PUBLIC_APP_URL/uvala-black-log.svg` (Logo local)
4. `https://uvala.ai/uvala-black-log.svg` (Fallback)

## 📋 **Lo que funciona AUTOMÁTICAMENTE:**

✅ **Todos los idiomas** (español, inglés, francés, japonés)
✅ **Todos los tipos de email** (bienvenida, suscripción, cancelación)
✅ **Reemplazo dinámico** de variables (`{{userName}}`, `{{planType}}`, etc.)
✅ **Logo responsivo** en móvil y desktop
✅ **Sin plantillas manuales** en Brevo

## 🚀 **Para activar:**

1. **Si tienes tu dominio:** Asegúrate que `uvala-black-log.svg` esté en `/public/`
2. **Si quieres usar Brevo:** Sube el logo y agrega `BREVO_LOGO_URL` al `.env.local`
3. **¡Listo!** Los emails automáticamente tendrán el logo

## 🧪 **Para probar:**

```bash
# Reinicia el servidor
npm run dev

# Envía un email de prueba desde tu app
# El logo debería aparecer automáticamente
```

## 🔧 **Solución de problemas:**

**Si el logo no aparece:**
1. Verifica que `uvala-black-log.svg` existe en `/public/`
2. Revisa la variable `NEXT_PUBLIC_APP_URL` en `.env.local`
3. Usa la URL completa en `BREVO_LOGO_URL` si subes a Brevo

**Ejemplo de configuración completa:**
```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://miapp.vercel.app
BREVO_LOGO_URL=https://img.brevo.com/987654/uvala-black-log.svg
BREVO_API_KEY=tu_api_key_aqui
```

## 🎉 **Resultado:**
- **0 plantillas manuales** necesarias en Brevo
- **Todos los emails** tienen logo automáticamente
- **Fácil cambio** de logo con variables de entorno
- **Soporte multiidioma** automático