import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import './NotFoundPage.css';

/** 404 page. Styles: NotFoundPage.css */
export default function NotFoundPage({ standalone }) {
  return (
    <div className={`not-found ${standalone ? 'not-found--standalone' : ''}`.trim()}>
      <div>
        <SearchOffIcon className="not-found__icon" />
        <h1 className="not-found__title">Page not found</h1>
        <p className="not-found__text">The page you're looking for doesn't exist or you don't have access to it.</p>
        <Button variant="contained" component={Link} to="/">Go to my dashboard</Button>
      </div>
    </div>
  );
}
