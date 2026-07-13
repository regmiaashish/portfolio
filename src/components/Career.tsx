import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Python / Django Intern</h4>
                <h5>Treeleaf Technologies</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Worked on Bluerock, a stock trading platform developed RESTful
              APIs and integrated candlestick chart visualizations using
              JavaScript charting libraries. Also contributed to a plagiarism
              and grammar testing platform built with FastAPI, focusing on
              scalable PDF analysis backend.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Back End Developer Intern</h4>
                <h5>Fagoon AI</h5>
              </div>
              <h3>2026</h3>
            </div>
            <p>
              Built production APIs for the Gains Garage SaaS platform and
              Alliance's automated AI calling pipeline. Integrated ElevenLabs,
              Twilio, and Stripe. Worked with FastAPI, MongoDB, PostgreSQL, and
              GCP across multiple products.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Junior Back End Developer</h4>
                <h5>Fagoon AI</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Building and maintaining RESTful APIs and backend infrastructure
              across Fagoon AI's product suite. Core contributor to Fagoon
              Upgrade — an open-source, self-hosted AI platform supporting
              drag-and-drop workflow building, WhatsApp agent deployment, and
              local LLM integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
