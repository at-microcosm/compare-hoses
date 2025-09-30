import { createRoot } from 'react-dom/client'
import { StyledEngineProvider } from '@mui/material/styles';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './index.css'
import App from './App.tsx'
import Deactivated from './deactivated/Deactivated.tsx'

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

const deactivated = location.search.includes("deactivated");

if (deactivated) {
  document.title = "Oops deactivated checker";
}

createRoot(document.getElementById('root')!).render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      {deactivated
        ? <Deactivated />
        : <App />}
    </ThemeProvider>
  </StyledEngineProvider>
)
