import { rootnative } from '@rootnative/web/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), rootnative()],
})
