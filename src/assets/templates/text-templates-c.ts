import { Asset } from '../../types/editor.types';

export const textTemplatesC: Asset[] = [
  {
    id: 'txt_motion_1',
    name: 'Dynamic Pop (Motion)',
    type: 'text',
    src: 'POP ANIMATION!',
    duration: 3,
    templateData: {
      textStyle: {
        fontFamily: 'Outfit',
        fontWeight: '900',
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 8,
        shadowBlur: 10,
        textTransform: 'uppercase'
      },
      properties: {
        positionX: 0,
        positionY: 0,
        scale: 150
      },
      animation: {
        in: 'pop',
        out: 'popOut',
        loop: 'pulse'
      }
    }
  },
  {
    id: 'txt_motion_2',
    name: 'Slide Up Reveal (Motion)',
    type: 'text',
    src: 'Breaking News',
    duration: 4,
    templateData: {
      textStyle: {
        fontFamily: 'Cairo',
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#ef4444',
        backgroundOpacity: 100,
        padding: 40,
        shadowBlur: 15,
        textTransform: 'uppercase'
      },
      properties: {
        positionX: 0,
        positionY: 300,
        scale: 100
      },
      animation: {
        in: 'slideUp',
        out: 'slideDown'
      }
    }
  },
  {
    id: 'txt_motion_3',
    name: 'Shaking Alert (Motion)',
    type: 'text',
    src: 'WARNING!',
    duration: 3,
    templateData: {
      textStyle: {
        fontFamily: 'Inter',
        fontWeight: '900',
        color: '#facc15',
        strokeColor: '#ef4444',
        strokeWidth: 6,
        shadowBlur: 20,
        textTransform: 'uppercase'
      },
      properties: {
        positionX: 0,
        positionY: -200,
        scale: 200,
        rotation: -5
      },
      animation: {
        in: 'pop',
        out: 'fadeOut',
        loop: 'shake'
      }
    }
  }
];
