<template>
    <div class="configuration-parameter">
        <label class="parameter-name" :for="param.name">{{ param.name }}<span v-if="!param.optional" class="required-parameter">*</span></label>
        <input class="parameter-entry" :type="inputType" :required="!param.optional" v-model="paramValue"/>
    </div>
</template>

<script>

export default {
    name: "ConfigurationParameter",
    props: ['param'],
    data() {
        return {
            paramValue: '',
        }
    },
    computed: {
        inputType() {
            if (this.param.sensitive) {
                return "password";
            }
            return this.param.kind === "integer" ? "number" : "text";
        },
    },
    watch: {
        paramValue: function(current, old) {
            let val = this.param.kind === "integer" ? Number(current) : current;
            this.$emit('param-value-updated', {paramName: this.param.name, paramValue: val});
        }
    }
}
</script>