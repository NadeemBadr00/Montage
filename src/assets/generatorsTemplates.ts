export const generatorsTemplates = [
    {
        id: 'gen_news_ticker',
        name: 'News Ticker',
        type: 'text',
        src: 'https://images.pexels.com/photos/3953481/pexels-photo-3953481.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Scrolling news ticker at the bottom of the screen.',
            textStyle: {
                text: 'BREAKING NEWS: MAJOR UPDATE RELEASED • NEW FEATURES ADDED •',
                fontSize: 30,
                fill: '#ffffff',
                fontFamily: 'Roboto',
                align: 'left'
            },
            properties: {
                y: 400,
                backgroundColor: '#cc0000',
                backgroundOpacity: 0.8
            },
            effects: {
                motion: 'scroll_left'
            }
        }
    },
    {
        id: 'gen_neon_sign',
        name: 'Neon Sign',
        type: 'text',
        src: 'https://images.pexels.com/photos/2235130/pexels-photo-2235130.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Glowing neon text effect.',
            textStyle: {
                text: 'NEON NIGHTS',
                fontSize: 80,
                fill: '#ff00ff',
                stroke: '#ffffff',
                strokeThickness: 2,
                fontFamily: 'Impact',
                align: 'center'
            },
            effects: {
                glow: true,
                glowColor: '#ff00ff',
                glowBlur: 20
            }
        }
    },
    {
        id: 'gen_typewriter',
        name: 'Typewriter Effect',
        type: 'text',
        src: 'https://images.pexels.com/photos/373499/pexels-photo-373499.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Text reveals letter by letter like a typewriter.',
            textStyle: {
                text: 'Once upon a time...',
                fontSize: 45,
                fill: '#ffffff',
                fontFamily: 'Courier New',
                align: 'center'
            },
            transitions: {
                in: 'typewriter',
                inDuration: 2
            }
        }
    },
    {
        id: 'gen_progress_bar',
        name: 'Progress Bar',
        type: 'shape',
        src: 'Progress Bar',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=80',
        templateData: {
            description: 'A progress bar that fills up over the duration of the clip.',
            properties: {
                shapeType: 'progress_bar',
                color: '#ef4444',
                positionY: 450,
                scaleX: 100,
                scaleY: 10
            }
        }
    },
    {
        id: 'gen_waveform',
        name: 'Audio Waveform',
        type: 'shape',
        src: 'Audio Waveform',
        thumbnail: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80',
        templateData: {
            description: 'Audio visualizer waveform.',
            properties: {
                shapeType: 'waveform',
                color: '#3b82f6',
                positionY: 300,
                scaleX: 100,
                scaleY: 50
            }
        }
    }
];
