import Page from '../components/Page.jsx';
import '../styles/pages/address.css';

export default function Address() {
  return (
    <Page title="How to Address an Article?" scope="address">
      <h1>Addressing an Article</h1>
      <p>
        The primary purpose of a properly written address is to ensure that the mail reaches its intended recipient without delays. A clear and complete address
        allows postal workers to quickly and accurately sort and deliver the mail.
      </p>
      <p>When sending an article to a post office with</p>
      <h2>Levels of Postmaster</h2>
      <div className="table-responsive ppc-table-wide">
        <table className="table table-bordered ppc-cards">
          <thead>
            <tr>
              <th>POST OFFICE ACRONYM/RANK</th>
              <th>POST OFFICE FULL FORM</th>
              <th>POSTMASTER LEVEL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="POST OFFICE ACRONYM/RANK">GPO</td>
              <td data-label="POST OFFICE FULL FORM">GENERAL POST OFFICE</td>
              <td data-label="POSTMASTER LEVEL" rowSpan="2">
                SENIOR POSTMASTER
              </td>
            </tr>
            <tr>
              <td data-label="POST OFFICE ACRONYM/RANK">HO</td>
              <td data-label="POST OFFICE FULL FORM">HEAD OFFICE</td>
            </tr>
            <tr>
              <td data-label="POST OFFICE ACRONYM/RANK">PB</td>
              <td data-label="POST OFFICE FULL FORM">PHILATELIC BUREAU</td>
              <td data-label="POSTMASTER LEVEL">DIRECTOR or INCHARGE</td>
            </tr>
            <tr>
              <td data-label="POST OFFICE ACRONYM/RANK">SO</td>
              <td data-label="POST OFFICE FULL FORM">SUB OFFICE</td>
              <td data-label="POSTMASTER LEVEL">SUB POSTMASTER</td>
            </tr>
            <tr>
              <td data-label="POST OFFICE ACRONYM/RANK">BO</td>
              <td data-label="POST OFFICE FULL FORM">BRANCH OFFICE</td>
              <td data-label="POSTMASTER LEVEL">BRANCH POSTMASTER</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>The below format is the proper way to write an address on the envelope when writing to a post office to collect a cancellation.</p>
      <h2>Sample Address</h2>
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>FORMAT</th>
              <th>EXAMPLE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="FORMAT" className="leftalign">
                ______ Postmaster,
                <br />
                {'{'}Post Office and Rank{'}'},<br />
                {'{'}Name of the town/city{'}'},<br />
                {'{'}District (dist.){'}'},<br />
                {'{'}State{'}'} - {'{'}Pincode{'}'}.
              </td>
              <td data-label="EXAMPLE" className="leftalign">
                Sub Postmaster,
                <br />
                Shaniwar Wada SO,
                <br />
                Pune,
                <br />
                Pune (dist.),
                <br />
                Maharashtra - 411030.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Page>
  );
}
