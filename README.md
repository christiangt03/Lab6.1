# Git Branch & Tag Validator (GitHub Action)

Una GitHub Custom Action escrita en JavaScript para **validar nombres de ramas, sanitizar identificadores y extraer versiones semánticas (SemVer)**. Ideal para homogeneizar y dar robustez a los pipelines de Integración Continua (CI/CD).

## 🚀 Características

- 🔍 **Validación por prefijos**: Comprueba que las ramas comiencen con nomenclaturas estándar (`feat/`, `fix/`, `chore/`, etc.).
- 🧼 **Normalización automática (Safe Slug)**: Convierte cualquier nombre de rama en un slug de URL/Docker válido (ej: `feat/user_auth` ➡️ `feat-user-auth`).
- 🏷️ **Parseador SemVer**: Detecta versiones SemVer (2.0.0) en ramas de release o etiquetas, y extrae una versión limpia (ej: de `release/v2.4.1-beta.2` extrae `2.4.1-beta.2`).
- 🛡️ **Robustez y Modo Strict**: Puedes elegir si un nombre de rama inválido simplemente retorna un output `is-valid: false` o si detiene y hace fallar el workflow (`fail-on-error: true`).
- 📦 **Cero dependencias en tiempo de ejecución**: Compilado y empaquetado en un único archivo autocontenido (`dist/index.js`).

---

## 📥 Inputs (Parámetros de Entrada)

| Nombre | Descripción | Requerido | Valor por Defecto |
| :--- | :--- | :---: | :--- |
| `branch-name` | Nombre de la rama o tag a validar. Si no se especifica, autodetecta la rama del workflow actual. | No | `''` |
| `allowed-prefixes` | Lista separada por comas de los prefijos permitidos para la validación. | No | `feat/,fix/,bugfix/,chore/,docs/,refactor/,release/,hotfix/` |
| `version-prefix` | Prefijo de versión utilizado al parsear tags SemVer (ej. `v` para `v1.0.0`). | No | `v` |
| `fail-on-error` | Si se establece en `true`, la acción fallará controladamente si la validación es negativa. | No | `false` |

---

## 📤 Outputs (Parámetros de Salida)

| Nombre | Descripción | Ejemplo de Salida |
| :--- | :--- | :--- |
| `is-valid` | `"true"` o `"false"` dependiendo de si cumple los prefijos establecidos. | `"true"` |
| `branch-type` | Prefijo detectado de la rama (ej. `feat`, `fix`, `release`, `mainline`). | `"feat"` |
| `safe-slug` | Nombre de la rama normalizado a minúsculas y caracteres seguros (sin caracteres especiales ni barras). | `"feat-user-auth"` |
| `extracted-version` | Versión limpia bajo SemVer extraída de la rama/tag. Retorna `N/A` si no contiene versión válida. | `"1.4.2-beta.1"` |
| `validation-message` | Mensaje descriptivo con el resultado detallado del análisis. | `"El nombre de la rama es válido..."` |

---

## 🛠️ Ejemplos de Uso

### Uso Básico e Impresión de Outputs

```yaml
name: CI Workflow

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      # Invocar la Custom Action (Uso local)
      - name: Run Branch Validator
        id: validator
        uses: christiangt03/Lab6.1@v1
        with:
          allowed-prefixes: 'feat/,fix/,chore/,release/'
          fail-on-error: 'false'

      # Consumir los outputs dinámicos en pasos posteriores
      - name: Process Outputs
        run: |
          echo "La rama es válida?: ${{ steps.validator.outputs.is-valid }}"
          echo "El slug seguro es: ${{ steps.validator.outputs.safe-slug }}"
          echo "Versión extraída: ${{ steps.validator.outputs.extracted-version }}"
```

### Uso Estricto (Falla si el nombre es incorrecto)

```yaml
      - name: Strict Branch Check
        uses: christiangt03/Lab6.1@v1
        with:
          fail-on-error: 'true' # El workflow se detendrá aquí si la rama no cumple el formato
```

---

## 💻 Desarrollo y Compilación

Si deseas modificar la lógica del validador:

1. Edita el archivo principal `index.js`.
2. Instala las dependencias de desarrollo y producción:
   ```bash
   npm install
   ```
3. Compila el código con `@vercel/ncc` para generar la distribución compilada en `dist/index.js`:
   ```bash
   npm run build
   ```
4. Agrega los cambios de `index.js` y `dist/index.js` a Git, realiza un commit y haz push.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
