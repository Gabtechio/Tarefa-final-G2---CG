# Cena Three.js + Rapier

Computação Gráfica: Cena em Three.JS + Rapier (JavaScript puro)

Prof. Fahad Kalil

Integrantes:

Juliana C. Teixeira (1136152)
Gabriel H. Techio (1135904)
Lucas Boeira Federizzi (1137202)


### Para executar 

- No terminal
  
  1) Criar um servidor http com Python:

          python -m http.server -b 127.0.0.1 8000

  2) Acessar via navegador:  [http://127.0.0.1:8000](http://127.0.0.1:8000)

Use os botões no topo para alternar entre a Cena 1  e a Cena 2 

## Estrutura

- `src/main.js` – ponto de entrada
- `src/World/World.js` – câmera, renderer, controles, Rapier, loop e troca de cena
- `src/World/components/Classroom.js` – cena obrigatória
- `src/World/components/OrangeRoom.js` – opção 2
- `src/World/components/Blind.js` – cortina animada com Rapier
- `src/World/components/TubeLight.js` – luminária feita do zero
- `src/World/components/Primitives.js` – helpers de geometria/material/textura
