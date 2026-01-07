/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";

// Load your modules here, e.g.:
// import * as fs from "fs";

class Hagelschutz extends utils.Adapter {
    private checkInterval?: ioBroker.Interval;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "hagelschutz-vkf",
        });
        this.on("ready", this.onReady.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        await this.setState("info.connection", false, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info(`Config deviceID: ${this.config.deviceID}`);
        this.log.info(`Config hwtypeld: ${this.config.hwtypeld}`);

        this.checkInterval = this.setInterval(() => void this.checkHailStatus(), 120 * 1000); // Check every 2 minutes
        void this.checkHailStatus();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback - the callback function to call when cleanup is done
     */
    private onUnload(callback: () => void): void {
        try {
            this.clearInterval(this.checkInterval);

            callback();
        } catch {
            callback();
        }
    }

    private async checkHailStatus(): Promise<void> {
        try {
            this.log.debug("Checking hail status...");
            const response = await fetch(
                `https://meteo.netitservices.com/api/v1/devices/${encodeURIComponent(this.config.deviceID)}/poll?hwtypeId=${encodeURIComponent(this.config.hwtypeld)}`,
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = (await response.json()) as { currentState: number };
            if (data.currentState === undefined || typeof data.currentState !== "number") {
                throw new Error(
                    `Invalid response format: currentState is missing or not a number: ${JSON.stringify(data)}`,
                );
            }

            await this.setState("info.connection", true, true);
            await this.setState("currentState", data.currentState, true);
            this.log.debug(`Hail status set to ${data.currentState}`);
        } catch (error: any) {
            this.log.warn(`Error checking hail status: ${error}`);
            await this.setState("info.connection", false, true);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Hagelschutz(options);
} else {
    // otherwise start the instance directly
    (() => new Hagelschutz())();
}
