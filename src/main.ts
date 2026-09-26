import { mount } from 'svelte';
import App from './ui/App.svelte';
import './styles/global.css';

// The e2e harness pages share chunks with this entry; only mount where the app root exists.
const target = document.getElementById('app');
if (target) mount(App, { target });
