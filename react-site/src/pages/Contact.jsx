import Page from '../components/Page.jsx';
import '../styles/pages/contact.css';

export default function Contact() {
  return (
    <Page title="Contact Us" scope="contact">
      <h1>Profiles</h1>
      <p>A group of the contributors who helped me curate and catalog the data related to PPCs.</p>
      <p>
        <b>Click on the profile to reach out to us via email.</b>
      </p>
      <div className="row">
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:ppcsofindia@gmail.com';
            }}
          >
            <div className="profile-name">Ch. Praneeth Sai</div>
            <div className="profile-role">
              A Computer Science graduate, an avid collector of the cancellations and other philatelic materials, and the designer of this website.
            </div>
            <div>Role: Data maintenance in the website.</div>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:drmksudhakar@gmail.com';
            }}
          >
            <div className="profile-name">Dr. M. K. Sudhakar, MD</div>
            <div className="profile-role">
              A postgraduate in MD General Medicine presently Consultant Physician and Honorary Professor based in Chennai. A Philatelic Hobbyist for over 3
              decades.
            </div>
            <div>Role: Information regarding PPCs.</div>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:indiamintstamp@gmail.com';
            }}
          >
            <div className="profile-name">Gunasekar Vadivel</div>
            <div className="profile-role">
              Graduate in Mechanical Engineering. Collecting various PPCs and several other philatelic materials from more than a decade.
            </div>
            <div>Role: Information regarding PPCs and First Day Covers of the same.</div>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:kuntevarad@gmail.com';
            }}
          >
            <div className="profile-name">Varad Kunte</div>
            <div className="profile-role">Student from Pune pursuing LLB, specifically collecting PPCs.</div>
            <div>Role: Information regarding PPCs. Identifying relevant errors.</div>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:jain.globalstamps@gmail.com';
            }}
          >
            <div className="profile-name">Piyush Jain</div>
            <div className="profile-role">
              A Post Graduate in Computer Applications. Businessman by profession. Philatelist and Deltiologist as a collector.
            </div>
            <div>Role: Information regarding PPCs.</div>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className="profile-tile"
            onClick={() => {
              window.location.href = 'mailto:kanvenpra@gmail.com';
            }}
          >
            <div className="profile-name">Venkataprasad K</div>
            <div className="profile-role">Graduate in B. Com. An active collector of PPCs, and Special Cancellations.</div>
            <div>Role: Information regarding Special Cancellations.</div>
          </div>
        </div>
      </div>
    </Page>
  );
}
