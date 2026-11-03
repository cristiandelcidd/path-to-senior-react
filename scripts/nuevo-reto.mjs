// Crea un reto nuevo a partir de retos/_plantilla.
// Uso: pnpm nuevo-reto <numero> <slug>
// Ejemplo: pnpm nuevo-reto 03 dashboard-ventas  →  retos/reto-03-dashboard-ventas (paquete "reto-03")

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [number, slug] = process.argv.slice(2)

if (!number || !/^\d{2}$/.test(number) || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Uso: pnpm nuevo-reto <numero de 2 dígitos> <slug-en-kebab-case>')
  console.error('Ejemplo: pnpm nuevo-reto 03 dashboard-ventas')
  process.exit(1)
}

const root = join(import.meta.dirname, '..')
const templateDir = join(root, 'retos', '_plantilla')
const packageName = `reto-${number}`
const targetDir = join(root, 'retos', `${packageName}-${slug}`)

if (existsSync(targetDir)) {
  console.error(`Ya existe ${targetDir}`)
  process.exit(1)
}

const ignored = new Set(['node_modules', 'dist'])
cpSync(templateDir, targetDir, { recursive: true, filter: (source) => !ignored.has(basename(source)) })

const packageJsonPath = join(targetDir, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
packageJson.name = packageName
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

writeFileSync(
  join(targetDir, 'ENUNCIADO.md'),
  `# Reto #${Number(number)}: ${slug}\n\n> Teoría: [ESTUDIO.md](../../ESTUDIO.md)\n> Ejecutar: \`pnpm --filter ${packageName} dev\`\n\n_Pendiente de redactar._\n`,
)

mkdirSync(join(targetDir, 'revisiones'))
writeFileSync(join(targetDir, 'revisiones', '.gitkeep'), '')

console.log(`✔ Creado retos/${packageName}-${slug}`)
console.log('  Siguiente paso: pnpm install')
