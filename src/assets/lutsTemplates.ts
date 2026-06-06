export const lutsTemplates = [
    {
        id: 'lut_cinematic_1',
        name: 'Cinematic Teal & Orange',
        type: 'lut',
        src: 'https://images.pexels.com/photos/255379/pexels-photo-255379.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Hollywood style teal and orange color grade.',
            properties: {
                brightness: 105,
                contrast: 115,
                saturation: 110,
                hue: 15
            }
        }
    },
    {
        id: 'lut_vintage_1',
        name: 'Vintage Film',
        type: 'lut',
        src: 'https://images.pexels.com/photos/247929/pexels-photo-247929.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Old school 35mm film look with faded blacks.',
            properties: {
                brightness: 110,
                contrast: 90,
                saturation: 60,
                sepia: 20
            }
        }
    },
    {
        id: 'lut_bw_high_contrast',
        name: 'Noir Noir',
        type: 'lut',
        src: 'https://images.pexels.com/photos/1004624/pexels-photo-1004624.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'High contrast black and white.',
            properties: {
                saturation: 0,
                contrast: 140,
                brightness: 95
            }
        }
    },
    {
        id: 'lut_cyberpunk',
        name: 'Cyberpunk Neon',
        type: 'lut',
        src: 'https://images.pexels.com/photos/311012/pexels-photo-311012.jpeg?auto=compress&cs=tinysrgb&w=200',
        templateData: {
            description: 'Vibrant neon colors with crushed blacks.',
            properties: {
                saturation: 150,
                contrast: 125,
                hue: -10,
                brightness: 90
            }
        }
    }
];
