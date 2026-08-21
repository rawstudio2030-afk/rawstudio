"""Validacion de CURP y calculo de edad.

La CURP ya codifica la fecha de nacimiento, asi que la mayoria de edad se puede
determinar sin leer el INE. El INE sirve para lo otro: comprobar que la CURP
pertenece a quien la presenta.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

# 1-4 letras, 6 digitos de fecha, sexo, 2 de entidad, 3 consonantes,
# homoclave (digito si nacio antes del 2000, letra si despues) y digito verificador.
PATRON = re.compile(
    r"^[A-Z][AEIOUX][A-Z]{2}"      # iniciales
    r"\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])"   # AAMMDD
    r"[HMX]"                        # sexo
    r"(AS|BC|BS|CC|CH|CL|CM|CS|DF|DG|GR|GT|HG|JC|MC|MN|MS|NE|NL|OC|PL|QR|QT|SL|SP|SR|TC|TL|TS|VZ|YN|ZS)"
    r"[B-DF-HJ-NP-TV-Z]{3}"         # consonantes internas
    r"[0-9A-Z]\d$"                  # homoclave + verificador
)

_ALFABETO = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"

# Palabras que el RENAPO sustituye por X para no formar terminos ofensivos.
INCONVENIENTES = {
    "BACA", "BAKA", "BUEI", "BUEY", "CACA", "CACO", "CAGA", "CAGO", "CAKA", "CAKO",
    "COGE", "COGI", "COJA", "COJE", "COJI", "COJO", "COLA", "CULO", "FALO", "FETO",
    "GETA", "GUEI", "GUEY", "JOTO", "KACA", "KACO", "KAGA", "KAGO", "KAKA", "KAKO",
    "KOGE", "KOGI", "KOJA", "KOJE", "KOJI", "KOJO", "KOLA", "KULO", "LILO", "LOCA",
    "LOCO", "LOKA", "LOKO", "MAME", "MAMO", "MEAR", "MEAS", "MEON", "MIAR", "MION",
    "MOCO", "MOKO", "MULA", "MULO", "NACA", "NACO", "PEDA", "PEDO", "PENE", "PIPI",
    "PITO", "POPO", "PUTA", "PUTO", "QULO", "RATA", "ROBA", "ROBE", "ROBO", "RUIN",
    "SENO", "TETA", "VACA", "VAGA", "VAGO", "VAKA", "VUEI", "VUEY", "WUEI", "WUEY",
}


def digito_verificador(curp: str) -> str:
    """Ultimo digito, calculado sobre los 17 anteriores."""
    suma = sum(_ALFABETO.index(c) * (18 - i) for i, c in enumerate(curp[:17]))
    residuo = suma % 10
    return "0" if residuo == 0 else str(10 - residuo)


@dataclass
class ResultadoCurp:
    valida: bool
    motivo: str | None
    nacimiento: date | None
    edad: int | None
    sexo: str | None

    @property
    def mayor_de_edad(self) -> bool:
        return self.edad is not None and self.edad >= 18


def analizar(curp: str, hoy: date | None = None) -> ResultadoCurp:
    hoy = hoy or date.today()
    curp = (curp or "").strip().upper().replace(" ", "")

    if len(curp) != 18:
        return ResultadoCurp(False, "La CURP debe tener 18 caracteres", None, None, None)
    if not PATRON.match(curp):
        return ResultadoCurp(False, "El formato de la CURP no es válido", None, None, None)
    if curp[:4] in INCONVENIENTES:
        # El RENAPO nunca emite estas: si aparece, es inventada.
        return ResultadoCurp(False, "La CURP no es válida", None, None, None)
    if curp[17] != digito_verificador(curp):
        return ResultadoCurp(False, "El dígito verificador no coincide", None, None, None)

    aa, mm, dd = int(curp[4:6]), int(curp[6:8]), int(curp[8:10])
    # La homoclave distingue el siglo: digito para el 1900, letra para el 2000.
    siglo = 1900 if curp[16].isdigit() else 2000
    try:
        nacimiento = date(siglo + aa, mm, dd)
    except ValueError:
        return ResultadoCurp(False, "La fecha de nacimiento no existe", None, None, None)

    if nacimiento > hoy:
        return ResultadoCurp(False, "La fecha de nacimiento es futura", None, None, None)

    edad = hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))
    return ResultadoCurp(True, None, nacimiento, edad, curp[10])
