// Registra os hooks de modulo que deixam o `node --test` importar as telas React
// (.jsx, alias `@/`, especificador sem extensao, .css). Passado por `--import` no
// script `test` do package.json. Ver docs/modules/area-membros/bugs/
// 2026-11-03-falha-na-consulta-de-direitos-vira-acesso-restrito-no-catalogo.md [T4].
import { register } from 'node:module';

register('./hooks.js', import.meta.url);
