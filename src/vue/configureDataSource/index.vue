<template>
    <div class="datasource-configuration-section">
        <form @submit.prevent>
            <div class="configuration-parameter">
                <label class="parameter-name" for="engineSelector">pick a DB engine<span class="required-parameter">*</span></label>
                <select class="parameter-entry" id="engineSelector" name="Choose DB Engine" @change="onEngineSelection">
                    <option v-for="engine in engines" :value="engine">{{ engine }}</option>
                </select>
            </div>
            <div class="configuration-parameter">
                <label class="parameter-name" for="dataSourceName">data source name<span class="required-parameter">*</span></label>
                <input class="parameter-entry" v-model="dataSourceName" required />
            </div>
            <ConfigurationParameter v-for="(confParam, idx) in confParamSpec" :param="confParam" :key="idx" @param-value-updated="onParamValueChange"/>
            <button class="configure" v-show="formFilled" @submit.prevent @click="onFormSubmission">Configure</button>
        </form>
    </div>
</template>

<script>
import ConfigurationParameter from './component/ConfigurationParameter.vue'

import {supportedDataSourceEngines, dataSourceConfigurationParameterSpecForEngine} from '../../service/configure_datasource/supportedSources.ts'

import { getVscodeEvent } from "../util/vscode";
let vscodeEvent;

export default {
    name: "ConfigureDataSource",
    components: {
        ConfigurationParameter
    },
    data() {
        return {
            engines: supportedDataSourceEngines(),
            engineSelected: '',
            confParamSpec: [],
            dataSourceName: '',
            confParam: {},
            formFilled: false,
        };
    },
    methods: {
        onEngineSelection() {
            this.engineSelected = document.getElementById("engineSelector").value;
            this.confParamSpec = dataSourceConfigurationParameterSpecForEngine(this.engineSelected);
            this.confParam = {};
        },
        onParamValueChange(changeDetails) {
            let paramName = changeDetails.paramName;
            let paramValue = changeDetails.paramValue;
            this.confParam[paramName] = paramValue;
            this.isFormFilled();
            // console.log(JSON.stringify(this.confParam));
        },
        isFormFilled() {
            if (!this.dataSourceName) {
                this.formFilled = false;
                return;
            }
            for (const p of this.confParamSpec) {
                // console.log(JSON.stringify(p));
                if (!p.optional) {
                    if (!this.confParam[p.name]) {
                        this.formFilled = false;
                        return;
                    }
                }
            }
            this.formFilled = true;
        },
        onFormSubmission() {
            let configurationDetails = {
                engine: this.engineSelected,
                name: this.dataSourceName,
                connectionParams: this.confParam,
            };
            console.log(JSON.stringify(configurationDetails));
            vscodeEvent.emit("configure", configurationDetails);
        }
    },
    created() {
        this.engineSelected = this.engines[0];
        this.confParamSpec = dataSourceConfigurationParameterSpecForEngine(this.engineSelected);
    },
    mounted() {
        vscodeEvent = getVscodeEvent();
    },
    watch: {
        dataSourceName: function(current, old) {
            this.isFormFilled();
        },
    }
}
</script>

<style lang="css">
.required-parameter {
    color: red;
}

.configuration-parameter {
    display: flex;
    /* background-color: grey; */
    margin: 5px;
}

.parameter-name {
    margin: 5px;
    font-weight: bold;
}

button {
    margin: 10px;
    width: 100px;
    height: 30px;
}
</style>