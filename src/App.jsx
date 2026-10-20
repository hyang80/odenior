import { useEffect, useLayoutEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import KnotCursor from './components/KnotCursor.jsx';
import ScentTrail from './components/ScentTrail.jsx';
import Opening from './components/Opening.jsx';
import SmoothScroll from './components/SmoothScroll.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import Home from './pages/Home.jsx';
import Brand from './pages/Brand.jsx';
import ObjectStory from './pages/ObjectStory.jsx';
import Product from './pages/Product.jsx';
import HowToUse from './pages/HowToUse.jsx';
import ObjectMotion from './pages/ObjectMotion.jsx';
import LiquidLab from './pages/LiquidLab.jsx';
import Bag from './pages/Bag.jsx';
import { useCanvasZoom } from './hooks/useCanvasZoom.js';

// Figma prototype: NAVIGATE actions reset scroll position and use DISSOLVE transitions.
function PageTransition({ children }) {
  const location = useLocation();
  const duration = location.state?.transition ?? 0;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className="page-transition"
      style={{ '--page-fade': `${duration}ms` }}
    >
      {children}
    </div>
  );
}

export default function App() {
  useCanvasZoom();
  const { pathname } = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'odenior',
      '/brand': 'Our Story — odenior',
      '/object-story': 'Object Story — odenior',
      '/product': 'Perfume — odenior',
      '/how-to-use': 'How to use — odenior',
      '/bag': 'Bag — odenior',
      '/object-motion': 'Object motion — odenior',
      '/liquid-lab': 'Liquid lab — odenior',
    };
    document.title = titles[pathname] ?? 'odenior';
  }, [pathname]);

  return (
    <>
      <Header variant={pathname === '/' ? 'home' : 'sub'} />
      <PageTransition>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/brand" element={<Brand />} />
          <Route path="/object-story" element={<ObjectStory />} />
          <Route path="/product" element={<Product />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/bag" element={<Bag />} />
          <Route path="/object-motion" element={<ObjectMotion />} />
          <Route path="/liquid-lab" element={<LiquidLab />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </PageTransition>
      <SmoothScroll />
      <ScrollProgress />
      <Opening />
      <ScentTrail />
      <KnotCursor />
    </>
  );
}
