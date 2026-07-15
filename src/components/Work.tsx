import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Work = () => {
  useGSAP(() => {
  if (window.innerWidth <= 1024) return;

  let translateX: number = 0;

  function setTranslateX() {
    const box = document.getElementsByClassName("work-box");
    const rectLeft = document
      .querySelector(".work-container")!
      .getBoundingClientRect().left;
    const rect = box[0].getBoundingClientRect();
    const parentWidth = box[0].parentElement!.getBoundingClientRect().width;
    let padding: number =
      parseInt(window.getComputedStyle(box[0]).padding) / 2;
    translateX = rect.width * box.length - (rectLeft + parentWidth) + padding;
  }

  setTranslateX();

  let timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".work-section",
      start: "top top",
      end: `+=${translateX}`,
      scrub: true,
      pin: true,
      id: "work",
    },
  });

  timeline.to(".work-flex", {
    x: -translateX,
    ease: "none",
  });

  return () => {
    timeline.kill();
    ScrollTrigger.getById("work")?.kill();
  };
}, []);
  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>
        <div className="work-flex">
          {[
            {
              name: "Fagoon Upgrade",
              category: "Open-source AI Platform",
              tools: "FastAPI, Python, Docker, OpenAI, Gemini, Ollama, Twilio",
              link: "https://github.com/regmiaashish",
              image: "/images/fagoon-upgrade.webp",
            },
            {
              name: "Gains Garage Backend",
              category: "SaaS / GenAI",
              tools: "FastAPI, NeonDB, PostgreSQL, GCP, GenAI, Stripe",
              link: "https://github.com/regmiaashish",
              image: "/images/gains-garage.webp",
            },
            {
              name: "Alliance Backend",
              category: "AI Calling Platform",
              tools: "FastAPI, MongoDB, Twilio, ElevenLabs, Stripe, Python",
              link: "https://github.com/regmiaashish",
              image: "/images/alliance-backend.webp",
            },
            {
              name: "Jarvis Voice Assistant",
              category: "Desktop App",
              tools: "Python, SpeechRecognition, pyttsx3, Web APIs",
              link: "https://github.com/regmiaashish/jarvis",
              image: "/images/jarvis.webp",
            },
            {
              name: "Cricket Management System",
              category: "Web Application",
              tools: "Python, Django, Django ORM, MySQL, JWT Auth",
              link: "https://github.com/regmiaashish/cricket-management-system",
              image: "/images/cricket-management.webp",
            },
          ].map((project, index) => (
            <div className="work-box" key={index}>
              <div className="work-info">
                <div className="work-title">
                  <h3>0{index + 1}</h3>
                  <div>
                    <h4>{project.name}</h4>
                    <p>{project.category}</p>
                  </div>
                </div>
                <h4>Tools and features</h4>
                <p>{project.tools}</p>
              </div>
              <WorkImage image={project.image} alt={project.name} link={project.link} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
