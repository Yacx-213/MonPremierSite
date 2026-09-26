(() => {
  function initBackground() {
    if (!document.body) {
      return;
    }

    /* Halo violet */
    const purple = document.createElement("div");
    purple.className = "site-glow site-glow-purple";

    /* Halo vert */
    const green = document.createElement("div");
    green.className = "site-glow site-glow-green";

    /* Halo bleu */
    const blue = document.createElement("div");
    blue.className = "site-glow site-glow-blue";

    /* Particules */
    const particles = document.createElement("div");
    particles.className = "site-particles";
    particles.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 14; i++) {
      const particle =
        document.createElement("span");

      particle.style.left =
        `${Math.random() * 100}%`;

      particle.style.top =
        `${Math.random() * 100}%`;

      particle.style.animationDelay =
        `${Math.random() * 8}s`;

      particles.appendChild(
        particle
      );
    }

    document.body.prepend(
      particles
    );

    document.body.prepend(
      blue
    );

    document.body.prepend(
      green
    );

    document.body.prepend(
      purple
    );

    /* Style des effets animés */
    const style =
      document.createElement("style");

    style.textContent = `
      .site-glow {
        position: fixed;
        width: 340px;
        height: 340px;
        border-radius: 50%;
        filter: blur(95px);
        opacity: .20;
        pointer-events: none;
        z-index: -3;
      }

      .site-glow-purple {
        top: 5%;
        left: -120px;
        background: #8b5cf6;
        animation:
          sitePurple 13s ease-in-out infinite;
      }

      .site-glow-green {
        top: 38%;
        right: -120px;
        background: #22c55e;
        animation:
          siteGreen 15s ease-in-out infinite;
      }

      .site-glow-blue {
        bottom: -140px;
        left: 35%;
        background: #3b82f6;
        animation:
          siteBlue 17s ease-in-out infinite;
      }

      .site-particles {
        position: fixed;
        inset: 0;
        z-index: -2;
        overflow: hidden;
        pointer-events: none;
      }

      .site-particles span {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(255,255,255,.45);
        box-shadow:
          0 0 12px rgba(255,255,255,.22);

        animation:
          siteParticle 12s ease-in-out infinite,
          siteBlink 3s ease-in-out infinite alternate;
      }

      @keyframes sitePurple {
        0%, 100% {
          transform:
            translate(0, 0)
            scale(1);
        }

        50% {
          transform:
            translate(100px, 70px)
            scale(1.18);
        }
      }

      @keyframes siteGreen {
        0%, 100% {
          transform:
            translate(0, 0)
            scale(1);
        }

        50% {
          transform:
            translate(-100px, 70px)
            scale(1.16);
        }
      }

      @keyframes siteBlue {
        0%, 100% {
          transform:
            translate(0, 0)
            scale(1);
        }

        50% {
          transform:
            translate(80px, -70px)
            scale(1.18);
        }
      }

      @keyframes siteParticle {
        0%, 100% {
          transform:
            translateY(0)
            translateX(0);
        }

        50% {
          transform:
            translateY(-45px)
            translateX(12px);
        }
      }

      @keyframes siteBlink {
        from {
          opacity: .10;
        }

        to {
          opacity: .72;
        }
      }

      @media (max-width: 700px) {
        .site-glow {
          width: 220px;
          height: 220px;
          filter: blur(70px);
          opacity: .16;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initBackground
    );
  } else {
    initBackground();
  }
})();