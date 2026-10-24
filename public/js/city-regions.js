// Tipo de região de cada território (índice = posição em MAP). Edite à vontade; a lógica não muda.
// Códigos: res = bairro residencial, com = região comercial, ind = zona industrial/logística,
//          port = zona industrial com PORTO, per = periferia, gar = periferia com GARIMPO.
// PORTOS (definidos pelo jogo): T36, T12, T19, T25, T31, T34, T35 e T7 — no máximo um porto por território.
// Garimpos: os territórios mais afastados do centro que não são portos (T10 e T11).
// Os demais tipos seguem o critério original: comerciais = 8 mais centrais; industriais = 6 seguintes; periferia = mais afastados; resto residencial.
const CITY_REGIONS=["per", "ind", "res", "com", "res", "per", "port", "res", "ind", "gar", "gar", "port", "res", "com", "res", "com", "res", "com", "port", "com", "ind", "com", "per", "ind", "port", "per", "com", "res", "res", "com", "port", "ind", "res", "port", "port", "port"];
if(typeof module!=="undefined"&&module.exports)module.exports=CITY_REGIONS;
