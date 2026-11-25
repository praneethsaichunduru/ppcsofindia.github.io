import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';

export default function NotFound() {
  return (
    <Page title="Page not found - Permanent Pictorial Cancellations">
      <h1>Page not found</h1>
      <p>
        The page you were looking for is not here. Try the <Link to="/">home page</Link>, the <Link to="/list-pincode.html">PPC List</Link> or{' '}
        <Link to="/blog/blog-main.html">Know About PPCs</Link>.
      </p>
    </Page>
  );
}
