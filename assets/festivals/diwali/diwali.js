/* ============================================
   DIWALI - Canvas Fireworks Effect
   Festival of Lights
   Credit: Friend's code (adjusted for website)
   ============================================ */

(function () {
    'use strict';

    // Create and setup canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'diwali-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Apply dark mode
    document.body.classList.add('diwali-mode');

    const fireworks = [];
    const particles = [];

    // Reduced particle count for mobile
    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 30 : 60;
    const FIREWORK_PROBABILITY = isMobile ? 0.025 : 0.04;

    class Firework {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * canvas.height * 0.4 + 80;
            this.speed = 4 + Math.random() * 3;
            this.exploded = false;
            this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        }

        update() {
            this.y -= this.speed;
            if (this.y <= this.targetY && !this.exploded) {
                this.explode();
                this.exploded = true;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        explode() {
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle(this.x, this.y, this.color));
            }
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = Math.random() * 2 + 0.5;
            this.life = 100;
            this.speedX = (Math.random() - 0.5) * 6;
            this.speedY = (Math.random() - 0.5) * 6;
            this.gravity = 0.04;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedY += this.gravity;
            this.life--;
        }

        draw() {
            ctx.globalAlpha = (this.life / 100) * 0.7; // Reduced opacity for website
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function animate() {
        // Clear with transparency for trail effect - REDUCED opacity for website visibility
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // Adjusted for website
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'lighter';

        // Random firework launch
        if (Math.random() < FIREWORK_PROBABILITY) {
            fireworks.push(new Firework());
        }

        // Update and draw fireworks
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update();
            fireworks[i].draw();
            if (fireworks[i].exploded) fireworks.splice(i, 1);
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    console.log('🪔 Diwali fireworks activated! Happy Diwali!');

    // Cleanup function for when effect is removed
    window.cleanupDiwali = function () {
        document.body.classList.remove('diwali-mode');
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    };

})();
