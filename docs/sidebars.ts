import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    { type: 'doc', id: 'introduction', label: 'Introduction' },
    { type: 'doc', id: 'installation', label: 'Installation' },
    { type: 'doc', id: 'vite-plugin', label: 'Vite plugin' },
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
        'touchablehighlight',
        'touchablenativefeedback',
        'touchableopacity',
        'touchablewithoutfeedback',
        'button',
        'scrollview',
        'flatlist',
        'textinput',
        'activityindicator',
        'statusbar',
      ],
    },
    {
      type: 'category',
      label: 'APIs',
      collapsed: false,
      items: [
        'stylesheet',
        'platform',
        'dimensions',
        'appearance',
        'accessibilityinfo',
        'i18nmanager',
        'backhandler',
        'pixelratio',
        'processcolor',
        'panresponder',
        'usepressability',
      ],
    },
  ],
}

export default sidebars
