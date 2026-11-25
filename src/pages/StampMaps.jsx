import Page from '../components/Page.jsx';
import '../styles/pages/stamps.css';

export default function StampMaps() {
  return (
    <Page title="Stamp Maps" scope="stamps" share>
      <h1>
        <b>STAMP MAPS</b>
      </h1>
      <p>
        Stamp maps are a philatelic concept where collectors analyze and categorize the exact elements depicted on postage stamps. This involves identifying
        landmarks, historical events, notable personalities, flora, fauna, cultural symbols, or technological advancements featured on stamps. Rather than just
        collecting stamps based on themes or issuing countries, stamp mapping focuses on precisely determining the subject matter represented, allowing for a
        more detailed and structured approach to philatelic research.
      </p>
      <p>
        Stamp maps offer a fascinating way to explore the connections between postage stamps and pictorial cancellations (PPCs). Many stamps feature buildings,
        flora, fauna, personalities, and statues that are also represented as PPCs, creating a unique overlap in philately. By studying these connections,
        collectors can gain a deeper understanding of how different themes are commemorated through both stamps and cancellations. Since designs and artistic
        interpretations may vary, identifying these links requires careful observation and comparison.
      </p>
      <p>
        A structured display of these stamps alongside their corresponding PPCs allows for an immersive and educational experience. By visually comparing them,
        philatelists can better appreciate the historical and thematic significance of these postal elements. Regularly updated collections and curated images
        help highlight these relationships, making it easier for enthusiasts to explore and document the intersections between stamps and pictorial
        cancellations in a more engaging way.
      </p>
      <div className="overview-images">
        <div>
          <img src="/pictures/stamp-maps/rath-yatra-puri.jpg" alt="Rath Yatra, Puri" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/100-years-of-airmail-1.jpg" alt="100 Years of Airmail 1" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/100-years-of-airmail-2.jpg" alt="100 Years of Airmail 2" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/vibrant-india-1.jpg" alt="Vibrant India - MS" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/vibrant-india-2.jpg" alt="Vibrant India - Stamp" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/tourism-in-india.jpg" alt="Tourism in India" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/golden-jubilee-of-pincode.jpg" alt="Golden Jubilee of Pincode" className="landscape" />
        </div>
        <div>
          <img src="/pictures/stamp-maps/azadi-ka-amrit-mahotsav.jpg" alt="Azadi Ka Amrit Mahotsav" className="landscape" />
        </div>
        <div>
          <img
            src="/pictures/stamp-maps/150th-anniversary-of-universal-postal-union.jpg"
            alt="150th Anniversary of Universal Postal Union"
            className="landscape"
          />
        </div>
        <div>
          <img src="/pictures/stamp-maps/ashtalakshmi-mahotsav.jpg" alt="Ashtalakshmi Mahotsav" className="landscape" />
        </div>
      </div>
    </Page>
  );
}
