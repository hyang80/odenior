import { useNavigate } from 'react-router-dom';

// Navigate with the Figma prototype's DISSOLVE duration (ms).
export function useNav() {
  const navigate = useNavigate();
  return (to, transition = 0) => navigate(to, { state: { transition } });
}
