/**
 * Prepara las pruebas de integración para que usen SOLO la base de datos de pruebas.
 * Las pruebas borran y recrean las tablas, por eso nunca deben tocar la base de producción.
 *
 * TEST_DATABASE_URL se toma del sistema o de server/.env.test (o .env.local).
 * En Neon se recomienda una rama "test" creada a partir de "production".
 */
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const archivos = ['.env', '.env.local', '.env.test'].filter((a) => existsSync(a));
const archivo = Object.assign({}, ...archivos.map((a) => dotenv.parse(readFileSync(a))));

const test = process.env.TEST_DATABASE_URL || archivo.TEST_DATABASE_URL;
if (!test) {
  throw new Error('Falta TEST_DATABASE_URL (base de datos de pruebas) en server/.env.test. Las pruebas no se ejecutan sobre producción.');
}
const produccion = [archivo.DATABASE_URL, archivo.DATABASE_URL_UNPOOLED, process.env.DATABASE_URL].filter(Boolean);
if (produccion.includes(test)) {
  throw new Error('TEST_DATABASE_URL es igual a la base de producción. Usa una base (o rama de Neon) distinta.');
}

process.env.DATABASE_URL = test;
process.env.DATABASE_URL_UNPOOLED = test;
process.env.JWT_SECRET ||= archivo.JWT_SECRET || 'secreto-solo-para-pruebas';
