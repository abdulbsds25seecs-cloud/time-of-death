import React from 'react';
import {createRoot} from 'react-dom/client';
import AmbientDither from '../src/AmbientDither.jsx';
import CaseExplorer from './CaseExplorer.jsx';
import './style.css';
createRoot(document.getElementById('root')).render(<><AmbientDither/><CaseExplorer/></>);
