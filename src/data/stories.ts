import type { ShortStory } from "@/lib/types";

export type { ShortStory };

/** Short stories used in reading practice and the /historias library. */
export const shortStories: ShortStory[] = [
  {
    id: "story-cafe-ana",
    level: "a1",
    title: "Ana at the Corner Cafe",
    titleEs: "Ana en el café de la esquina",
    minutes: 2,
    text: `Good morning. My name is Ana. I am at the corner cafe near my school.
The barista smiles and asks, "Are you a student?" "Yes, I am," Ana says. "I am from Puebla."
She looks at the menu. "I would like a small coffee, please." The coffee is warm. Ana feels ready for class.`,
    translation: `Buenos días. Me llamo Ana. Estoy en el café de la esquina cerca de mi escuela.
La barista sonríe y pregunta: «¿Eres estudiante?» «Sí», dice Ana. «Soy de Puebla.»
Mira el menú. «Quisiera un café chico, por favor.» El café está caliente. Ana se siente lista para la clase.`,
    moralEs: "Presentarte y pedir algo simple abre la conversación.",
  },
  {
    id: "story-sunday-breakfast",
    level: "a1",
    title: "Sunday Breakfast",
    titleEs: "El desayuno del domingo",
    minutes: 2,
    text: `Sunday breakfast is loud in our house. My sister is 16. My parents are in the kitchen.
Dad makes eggs. Mom cuts fruit. I set the table and call everyone.
We sit together. We talk about school and soccer. I like Sundays because we are all home.`,
    translation: `El desayuno del domingo es ruidoso en nuestra casa. Mi hermana tiene 16. Mis padres están en la cocina.
Papá hace huevos. Mamá corta fruta. Yo pongo la mesa y llamo a todos.
Nos sentamos juntos. Hablamos de la escuela y el fútbol. Me gustan los domingos porque todos estamos en casa.`,
    moralEs: "Describe a tu familia con is/are y rutinas simples.",
  },
  {
    id: "story-lost-bus",
    level: "a2",
    title: "The Lost Bus Card",
    titleEs: "La tarjeta del camión perdida",
    minutes: 3,
    text: `Maya usually takes the bus at 7:30. Today her bus card is not in her bag.
She looks under the bed. She looks in her jacket. Finally she finds it in yesterday's notebook.
She runs to the stop. The bus is late, so she still arrives on time. Maya laughs and says, "I need better habits."`,
    translation: `Maya normalmente toma el camión a las 7:30. Hoy su tarjeta no está en la bolsa.
Mira debajo de la cama. Mira en su chaqueta. Al final la encuentra en el cuaderno de ayer.
Corre a la parada. El camión va tarde, así que igual llega a tiempo. Maya ríe y dice: «Necesito mejores hábitos.»`,
    moralEs: "Habla de hábitos, problemas pequeños y soluciones cotidianas.",
  },
  {
    id: "story-market-help",
    level: "a2",
    title: "Help at the Market",
    titleEs: "Ayuda en el mercado",
    minutes: 3,
    text: `Luis goes to the market every Saturday. An older woman cannot carry her bags.
"Can I help you?" he asks. "Yes, please," she says. They walk two blocks to her building.
She gives him an orange and thanks him. Luis feels happy. Small help can change a morning.`,
    translation: `Luis va al mercado cada sábado. Una señora mayor no puede cargar sus bolsas.
«¿Te puedo ayudar?» pregunta. «Sí, por favor», dice ella. Caminan dos cuadras hasta su edificio.
Ella le da una naranja y le agradece. Luis se siente feliz. Una ayuda pequeña puede cambiar una mañana.`,
    moralEs: "Practica ofrecimientos, cortesía y descripciones de acciones.",
  },
  {
    id: "story-group-project",
    level: "b1",
    title: "The Group Project",
    titleEs: "El proyecto en equipo",
    minutes: 4,
    text: `Our science project was due on Friday. At first nobody wanted to lead.
Then Sofia said, "I will organize the slides if you write the report." We agreed.
On Thursday night we still had problems with the chart. We fixed it together and presented the next day.
The teacher said our teamwork was clear. I learned that plans change, but roles help.`,
    translation: `Nuestro proyecto de ciencias se entregaba el viernes. Al principio nadie quería liderar.
Entonces Sofía dijo: «Yo organizo las diapositivas si ustedes escriben el reporte.» Aceptamos.
El jueves por la noche todavía teníamos problemas con la gráfica. Lo arreglamos juntos y presentamos al día siguiente.
La maestra dijo que se notaba el trabajo en equipo. Aprendí que los planes cambian, pero los roles ayudan.`,
    moralEs: "Narra problemas, acuerdos y aprendizajes en pasado.",
  },
  {
    id: "story-rainy-interview",
    level: "b2",
    title: "A Rainy Interview",
    titleEs: "Una entrevista bajo la lluvia",
    minutes: 4,
    text: `If I had checked the weather, I would have left earlier. The rain delayed every bus.
When I finally arrived, my shoes were wet and my notes were wrinkled. I apologized and explained the delay.
The interviewer smiled. "We have all been late in this city," she said. We talked about projects I had led and mistakes I had learned from.
I did not get the job that week, but I got a second interview. Sometimes composure matters more than perfect timing.`,
    translation: `Si hubiera revisado el clima, habría salido antes. La lluvia retrasó todos los camiones.
Cuando por fin llegué, mis zapatos estaban mojados y mis notas arrugadas. Pedí disculpas y expliqué el retraso.
La entrevistadora sonrió. «Todos hemos llegado tarde en esta ciudad», dijo. Hablamos de proyectos que yo había liderado y errores de los que había aprendido.
No conseguí el trabajo esa semana, pero sí una segunda entrevista. A veces la compostura importa más que la puntualidad perfecta.`,
    moralEs: "Usa condicionales e hipótesis para contar una anécdota con matiz.",
  },
];

export function storiesForLevel(level: ShortStory["level"]) {
  return shortStories.filter((story) => story.level === level);
}

export function storyById(id: string) {
  return shortStories.find((story) => story.id === id) ?? null;
}
