import confetti from 'canvas-confetti';

// „ჩემი სამოსი“: the fireworks when a part is added (the chokha's and the kaba's), a bigger show for the last one
const COLORS = ['#7a2028', '#c8962e', '#f3e3c6', '#1e2f5a'];

export const fireworks = (finale: boolean) => {
  const shots = finale ? 7 : 3;
  for (let i = 0; i < shots; i++) {
    setTimeout(() => {
      confetti({
        particleCount: finale ? 80 : 55,
        spread: 360,
        startVelocity: finale ? 32 : 26,
        ticks: finale ? 95 : 70,
        gravity: 0.85,
        scalar: finale ? 1 : 0.85,
        colors: COLORS,
        shapes: finale && i % 2 ? ['star'] : ['circle', 'square'],
        origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.3 },
        zIndex: 200,
        disableForReducedMotion: true,
      });
    }, i * (finale ? 260 : 220));
  }
};
