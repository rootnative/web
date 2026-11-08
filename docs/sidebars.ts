import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    { type: 'doc', id: 'index', label: 'Introduction' },
    { type: 'doc', id: 'installation', label: 'Installation' },
    { type: 'doc', id: 'status', label: 'Status' },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: ['semantic-html', 'styles', 'server-rendering', 'seo'],
    },
    {
      type: 'category',
      label: 'Components',
      collapsed: false,
      items: [
        'view',
        'text',
        'image',
        'pressable',
        'scrollview',
        'flatlist',
        'textinput',
        'statusbar',
      ],
    },
    {
      type: 'category',
      label: 'APIs',
      collapsed: false,
      items: ['stylesheet', 'platform', 'dimensions', 'appearance', 'pixelratio', 'processcolor'],
    },
  ],
}

export default sidebars
