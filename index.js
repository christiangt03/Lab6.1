const core = require('@actions/core');

function run() {
  try {
    core.info('=============================================');
    core.info('       Git Branch & Tag Validator Action     ');
    core.info('=============================================');

    // 1. Obtener y procesar inputs
    let branchNameInput = core.getInput('branch-name');
    const allowedPrefixesInput = core.getInput('allowed-prefixes');
    const versionPrefix = core.getInput('version-prefix') || 'v';
    const failOnError = core.getInput('fail-on-error') === 'true';

    // Robustez: Gestión de valores vacíos e inputs nulos
    let branchName = (branchNameInput || '').trim();

    if (!branchName) {
      core.info('El input "branch-name" está vacío. Intentando recuperar desde las variables de entorno de GitHub...');
      // Intentar obtener de GITHUB_REF_NAME (nombre corto ej. 'main' o 'feat/login')
      // o GITHUB_REF (completo ej. 'refs/heads/feat/login' o 'refs/tags/v1.0.0')
      branchName = process.env.GITHUB_REF_NAME || '';
      
      if (!branchName && process.env.GITHUB_REF) {
        const ref = process.env.GITHUB_REF;
        if (ref.startsWith('refs/heads/')) {
          branchName = ref.replace('refs/heads/', '');
        } else if (ref.startsWith('refs/tags/')) {
          branchName = ref.replace('refs/tags/', '');
        } else {
          branchName = ref;
        }
      }
    }

    branchName = branchName.trim();

    // Si aún está vacío, lanzar error controlado
    if (!branchName) {
      throw new Error(
        'No se pudo determinar el nombre de la rama o tag. ' +
        'Asegúrate de proporcionar el input "branch-name" o de ejecutar la acción en un contexto de GitHub Actions.'
      );
    }

    core.info(`Rama/Tag a validar: "${branchName}"`);

    // 2. Procesar prefijos permitidos
    const allowedPrefixes = allowedPrefixesInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    core.info(`Prefijos permitidos: [${allowedPrefixes.join(', ')}]`);

    // 3. Evaluar validez del nombre
    let isValid = false;
    let branchType = 'unknown';

    // Determinar si la rama coincide con alguno de los prefijos permitidos
    for (const prefix of allowedPrefixes) {
      if (branchName.startsWith(prefix)) {
        isValid = true;
        // Quitar la barra inclinada final para el tipo de rama (ej. 'feat/' -> 'feat')
        branchType = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
        break;
      }
    }

    // Caso especial: si es la rama principal por defecto ('main' o 'master'), considerarla válida
    if (!isValid && (branchName === 'main' || branchName === 'master' || branchName === 'develop')) {
      isValid = true;
      branchType = 'mainline';
      core.info(`Rama detectada como línea principal válida: "${branchName}"`);
    }

    // 4. Normalizar nombre (Generar safe-slug)
    // - Convertir a minúsculas
    // - Reemplazar caracteres especiales y barras con guiones (-)
    // - Eliminar guiones duplicados y leading/trailing dashes
    let safeSlug = branchName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    core.info(`Slug normalizado generado: "${safeSlug}"`);

    // 5. Validar y normalizar SemVer si aplica (ej. en ramas de 'release/' o si parece un tag)
    let extractedVersion = '';
    let isSemVer = false;

    // Regex oficial de Semantic Versioning (SemVer 2.0.0)
    // Acepta opcionalmente un prefijo de versión al inicio
    const semVerRegexStr = `^(?:${escapeRegExp(versionPrefix)})?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$`;
    const semVerRegex = new RegExp(semVerRegexStr);

    let stringToParseVersion = branchName;
    // Si es rama 'release/v1.0.0' o similar, extraer la parte de la versión
    if (branchName.includes('/')) {
      const parts = branchName.split('/');
      stringToParseVersion = parts[parts.length - 1];
    }

    const semVerMatch = stringToParseVersion.match(semVerRegex);
    if (semVerMatch) {
      isSemVer = true;
      // Reconstruir la versión limpia sin el prefijo 'v'
      const major = semVerMatch[1];
      const minor = semVerMatch[2];
      const patch = semVerMatch[3];
      const prerelease = semVerMatch[4] ? `-${semVerMatch[4]}` : '';
      const buildmetadata = semVerMatch[5] ? `+${semVerMatch[5]}` : '';
      extractedVersion = `${major}.${minor}.${patch}${prerelease}${buildmetadata}`;
      core.info(`Versión SemVer válida detectada: "${extractedVersion}"`);
    }

    // 6. Generar mensaje de validación estructurado
    let validationMessage = '';
    if (isValid) {
      validationMessage = `El nombre de la rama "${branchName}" es válido. Tipo detectado: "${branchType}".`;
      if (isSemVer) {
        validationMessage += ` Contiene una versión SemVer válida: ${extractedVersion}.`;
      }
    } else {
      validationMessage = `El nombre de la rama "${branchName}" es INVÁLIDO. No coincide con ningún prefijo permitido (${allowedPrefixes.join(', ')}).`;
    }

    core.info(`Resultado de la Validación: ${validationMessage}`);

    // 7. Establecer los outputs
    core.setOutput('is-valid', isValid.toString());
    core.setOutput('branch-type', branchType);
    core.setOutput('safe-slug', safeSlug);
    core.setOutput('extracted-version', extractedVersion || 'N/A');
    core.setOutput('validation-message', validationMessage);

    // 8. Fallo controlado si se requiere
    if (!isValid && failOnError) {
      core.setFailed(`Fallo de validación de rama: ${validationMessage}`);
    }

  } catch (error) {
    // Captura y gestión robusta de errores controlados
    core.setFailed(`Error en la ejecución de la acción: ${error.message}`);
  }
}

// Función auxiliar para escapar caracteres regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

run();
