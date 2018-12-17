
const fs = require('fs');
const path = require('path');
const pack = require('./pack');
const uglifyJS = require('uglify-js');


let editions = {
    ssr: {},

    '__': {
        ignoreFeatures: ['ssr', 'devtool', 'error']
    },

    min: {
        ignoreFeatures: ['ssr', 'devtool', 'error'],
        compress: 1
    },

    dev: {
        ignoreFeatures: ['ssr']
    },

    'modern': {
        ignoreFeatures: ['ssr', 'devtool', 'error', 'allua']
    },

    'modern.min': {
        ignoreFeatures: ['ssr', 'devtool', 'error', 'allua'],
        compress: 1
    },

    'modern.dev': {
        ignoreFeatures: ['ssr', 'allua']
    },

    spa: {
        ignoreFeatures: ['ssr', 'devtool', 'reverse', 'error']
    },

    'spa.min': {
        ignoreFeatures: ['ssr', 'devtool', 'reverse', 'error'],
        compress: 1
    },

    'spa.dev': {
        ignoreFeatures: ['ssr', 'reverse']
    },

    'spa.modern': {
        ignoreFeatures: ['ssr', 'devtool', 'reverse', 'error', 'allua']
    },

    'spa.modern.min': {
        ignoreFeatures: ['ssr', 'devtool', 'reverse', 'error', 'allua'],
        compress: 1
    },

    'spa.modern.dev': {
        ignoreFeatures: ['ssr', 'reverse', 'allua']
    }
};

function build() {
    let rootDir = path.resolve(__dirname, '..');
    let distDir = path.resolve(rootDir, 'dist');

    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
    }

    let version = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'))).version;

    let source = pack(rootDir).replace(/##version##/g, version);


    Object.keys(editions).forEach(edition => {
        let option = editions[edition];
        let editionSource = clearFeatureCode(source, option.ignoreFeatures);

        if (option.compress) {
            let ast = uglifyJS.parse(editionSource);
            ast.figure_out_scope({screw_ie8: false});
            ast = ast.transform(new uglifyJS.Compressor({screw_ie8: false}));

            // need to figure out scope again so mangler works optimally
            ast.figure_out_scope({screw_ie8: false});
            ast.compute_char_frequency({screw_ie8: false});
            ast.mangle_names({screw_ie8: false});

            editionSource = ast.print_to_string({screw_ie8: false});
        }

        fs.writeFileSync(
            edition === '__' ? `${distDir}/san.js` : `${distDir}/san.${edition}.js`,
            editionSource,
            'UTF-8'
        );
    });
}

function clearFeatureCode(source, ignoreFeatures) {
    if (!ignoreFeatures) {
        return source;
    }

    let beginRule = /^\s*\/\/\s*#\[begin\]\s*(\w+)\s*$/;
    let endRule = /^\s*\/\/\s*#\[end\]\s*$/;

    let featureRule = new RegExp('(' + ignoreFeatures.join('|') + ')');
    let state = 0;
    return source.split('\n')
        .map(line => {
            switch (state) {
                case 1:
                case 2:
                    if (endRule.test(line)) {
                        state = 0;
                    }
                    else if (state === 2) {
                        return '// ' + line;
                    }
                    break;

                case 0:
                    let match;
                    if ((match = beginRule.exec(line))) {
                        state = featureRule.test(match[1]) ? 2 : 1;
                    }
                    break;
            }

            return line;
        })
        .join('\n');
}

exports = module.exports = build;

build();
