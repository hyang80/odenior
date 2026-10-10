import { useNavigate } from 'react-router-dom';

// Navigate with the Figma prototype's DISSOLVE duration (ms); `extra` rides along in the route
// state (e.g. which ODD SERIES bottle the product page should open on).
export function useNav() {
  const navigate = useNavigate();
  return (to, transition = 0, extra = {}) => navigate(to, { state: { ...extra, transition } });
}
