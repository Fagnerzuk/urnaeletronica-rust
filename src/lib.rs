use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone)]
pub struct Candidato {
    pub numero: u16,
    pub nome: String,
    pub partido: String,
    pub votos: u32,
}

#[wasm_bindgen]
pub struct Urna {
    candidatos: Vec<Candidato>,
}

#[wasm_bindgen]
impl Urna {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Urna {
        Urna {
            candidatos: vec![
                Candidato { numero: 101, nome: "Ana Silva".into(), partido: "ABC".into(), votos: 0 },
                Candidato { numero: 202, nome: "Bruno Costa".into(), partido: "XYZ".into(), votos: 0 },
                Candidato { numero: 303, nome: "Carla Souza".into(), partido: "DEF".into(), votos: 0 },
            ],
        }
    }

    pub fn buscar_candidato(&self, numero: u16) -> JsValue {
        match self.candidatos.iter().find(|c| c.numero == numero) {
            Some(c) => serde_wasm_bindgen::to_value(c).unwrap(),
            None => JsValue::NULL,
        }
    }

    pub fn votar(&mut self, numero: u16) -> Result<JsValue, JsValue> {
        let candidato = self
            .candidatos
            .iter_mut()
            .find(|c| c.numero == numero)
            .ok_or_else(|| JsValue::from_str("Candidato não encontrado"))?;

        candidato.votos += 1;
        Ok(serde_wasm_bindgen::to_value(candidato).unwrap())
    }

    pub fn branco(&mut self) -> JsValue {
        JsValue::from_str("VOTO BRANCO")
    }

    pub fn resultados(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.candidatos).unwrap()
    }

    pub fn total_votos(&self) -> u32 {
        self.candidatos.iter().map(|c| c.votos).sum()
    }
}
