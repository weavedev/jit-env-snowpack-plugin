const JitEnv = require('./JitEnv');

class JitEnvSnowpackPlugin {
    name = "@weavedev/jit-env-snowpack-plugin";

    JESP_isDev = undefined;
    JESP_jitEnvInstance = undefined;
    JESP_htmlFiles = [];

    JESP_options = undefined;

    constructor(options = {}) {
        this.JESP_options = options;
    }

    /**
     * Hook for snowpack to call on file changes
     */
    transform({ contents, fileExt, srcPath, isDev }) {
        // Filter file types
        switch(fileExt) {
            case '.html':
                // Register HTML files to receive updates on env changes
                this.JESP_registerHtml(srcPath);

                // Get jitEnv instance
                const jitEnv = this.JESP_jitEnv(isDev);
                
                return { contents: jitEnv.transform(contents) };
            default:
                return;
        }
    }

    /**
     * Hook to be injected by snowpack to mark file changes
     * @param {string} changed - Path to file changed
     */
    markChanged() {
        throw new Error(`Unexpected missing snowpack hook: markChanged`);
    }

    /**
     * Get JitEnv instance
     * @returns {JitEnv}
     */
    JESP_jitEnv(isDev) {
        // Set mode and ensure mode doesn't change
        if (this.JESP_isDev !== isDev) {
            if (this.JESP_isDev === undefined) {
                this.JESP_isDev = isDev;
            } else {
                throw new Error(`Unexpected dev-mode change. Was ${this.JESP_isDev} but is now ${isDev}`);
            }
        }

        // Create JitEnv instance if none exists
        if (this.JESP_jitEnvInstance === undefined) {
            this.JESP_jitEnvInstance = new JitEnv(
                // Pass configuration
                isDev ? this.JESP_options.dev : this.JESP_options.build,
                // Pass update hook
                this.JESP_requestUpdate,
            );
        }

        // Return JitEnv
        return this.JESP_jitEnvInstance;
    }

    /**
     * Registers a HTML file to receive updates on changes in ENV data
     * @param {string} path 
     */
    JESP_registerHtml(path) {
        if (!this.JESP_htmlFiles.includes(path)) {
            this.JESP_htmlFiles.push(path);
        }
    }

    /**
     * Hook for JitEnv to queue all HTML files for an update after a change in ENV data
     */
    JESP_requestUpdate = () => {
        this.JESP_htmlFiles.forEach((path) => {
            this.markChanged(path);
        });
        // HACK: Watch generated type file as a fallback for snowpack's flaky on-html-change reload feature
        if (this.JESP_options.dev && this.JESP_options.dev.emitTypes) {
            this.markChanged(this.JESP_options.dev.emitTypes);
        }
    }
}

/**
 * Snowpack plugin definition
 */
module.exports = (_, options) => new JitEnvSnowpackPlugin(options);
