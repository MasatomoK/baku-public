
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false }) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class Dream$1 {
        constructor(user, message) {
            this.user = user;
            this.message = message;
        }
    }

    var NAMED_TAG = "named";
    var NAME_TAG = "name";
    var UNMANAGED_TAG = "unmanaged";
    var OPTIONAL_TAG = "optional";
    var INJECT_TAG = "inject";
    var MULTI_INJECT_TAG = "multi_inject";
    var TAGGED = "inversify:tagged";
    var TAGGED_PROP = "inversify:tagged_props";
    var PARAM_TYPES = "inversify:paramtypes";
    var DESIGN_PARAM_TYPES = "design:paramtypes";
    var POST_CONSTRUCT = "post_construct";
    var PRE_DESTROY = "pre_destroy";
    function getNonCustomTagKeys() {
        return [
            INJECT_TAG,
            MULTI_INJECT_TAG,
            NAME_TAG,
            UNMANAGED_TAG,
            NAMED_TAG,
            OPTIONAL_TAG,
        ];
    }
    var NON_CUSTOM_TAG_KEYS = getNonCustomTagKeys();

    var BindingScopeEnum = {
        Request: "Request",
        Singleton: "Singleton",
        Transient: "Transient"
    };
    var BindingTypeEnum = {
        ConstantValue: "ConstantValue",
        Constructor: "Constructor",
        DynamicValue: "DynamicValue",
        Factory: "Factory",
        Function: "Function",
        Instance: "Instance",
        Invalid: "Invalid",
        Provider: "Provider"
    };
    var TargetTypeEnum = {
        ClassProperty: "ClassProperty",
        ConstructorArgument: "ConstructorArgument",
        Variable: "Variable"
    };

    var idCounter = 0;
    function id() {
        return idCounter++;
    }

    var Binding = (function () {
        function Binding(serviceIdentifier, scope) {
            this.id = id();
            this.activated = false;
            this.serviceIdentifier = serviceIdentifier;
            this.scope = scope;
            this.type = BindingTypeEnum.Invalid;
            this.constraint = function (request) { return true; };
            this.implementationType = null;
            this.cache = null;
            this.factory = null;
            this.provider = null;
            this.onActivation = null;
            this.onDeactivation = null;
            this.dynamicValue = null;
        }
        Binding.prototype.clone = function () {
            var clone = new Binding(this.serviceIdentifier, this.scope);
            clone.activated = (clone.scope === BindingScopeEnum.Singleton) ? this.activated : false;
            clone.implementationType = this.implementationType;
            clone.dynamicValue = this.dynamicValue;
            clone.scope = this.scope;
            clone.type = this.type;
            clone.factory = this.factory;
            clone.provider = this.provider;
            clone.constraint = this.constraint;
            clone.onActivation = this.onActivation;
            clone.onDeactivation = this.onDeactivation;
            clone.cache = this.cache;
            return clone;
        };
        return Binding;
    }());

    var DUPLICATED_INJECTABLE_DECORATOR = "Cannot apply @injectable decorator multiple times.";
    var DUPLICATED_METADATA = "Metadata key was used more than once in a parameter:";
    var NULL_ARGUMENT = "NULL argument";
    var KEY_NOT_FOUND = "Key Not Found";
    var AMBIGUOUS_MATCH = "Ambiguous match found for serviceIdentifier:";
    var CANNOT_UNBIND = "Could not unbind serviceIdentifier:";
    var NOT_REGISTERED = "No matching bindings found for serviceIdentifier:";
    var MISSING_INJECTABLE_ANNOTATION = "Missing required @injectable annotation in:";
    var MISSING_INJECT_ANNOTATION = "Missing required @inject or @multiInject annotation in:";
    var UNDEFINED_INJECT_ANNOTATION = function (name) {
        return "@inject called with undefined this could mean that the class " + name + " has " +
            "a circular dependency problem. You can use a LazyServiceIdentifer to  " +
            "overcome this limitation.";
    };
    var CIRCULAR_DEPENDENCY = "Circular dependency found:";
    var INVALID_BINDING_TYPE = "Invalid binding type:";
    var NO_MORE_SNAPSHOTS_AVAILABLE = "No snapshot available to restore.";
    var INVALID_MIDDLEWARE_RETURN = "Invalid return type in middleware. Middleware must return!";
    var INVALID_FUNCTION_BINDING = "Value provided to function binding must be a function!";
    var LAZY_IN_SYNC = function (key) { return "You are attempting to construct '" + key + "' in a synchronous way\n but it has asynchronous dependencies."; };
    var INVALID_TO_SELF_VALUE = "The toSelf function can only be applied when a constructor is " +
        "used as service identifier";
    var INVALID_DECORATOR_OPERATION = "The @inject @multiInject @tagged and @named decorators " +
        "must be applied to the parameters of a class constructor or a class property.";
    var ARGUMENTS_LENGTH_MISMATCH = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return "The number of constructor arguments in the derived class " +
            (values[0] + " must be >= than the number of constructor arguments of its base class.");
    };
    var CONTAINER_OPTIONS_MUST_BE_AN_OBJECT = "Invalid Container constructor argument. Container options " +
        "must be an object.";
    var CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE = "Invalid Container option. Default scope must " +
        "be a string ('singleton' or 'transient').";
    var CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE = "Invalid Container option. Auto bind injectable must " +
        "be a boolean";
    var CONTAINER_OPTIONS_INVALID_SKIP_BASE_CHECK = "Invalid Container option. Skip base check must " +
        "be a boolean";
    var ASYNC_UNBIND_REQUIRED = "Attempting to unbind dependency with asynchronous destruction (@preDestroy or onDeactivation)";
    var POST_CONSTRUCT_ERROR = function (clazz, errorMessage) { return "@postConstruct error in class " + clazz + ": " + errorMessage; };
    var PRE_DESTROY_ERROR = function (clazz, errorMessage) { return "@preDestroy error in class " + clazz + ": " + errorMessage; };
    var ON_DEACTIVATION_ERROR = function (clazz, errorMessage) { return "onDeactivation() error in class " + clazz + ": " + errorMessage; };
    var CIRCULAR_DEPENDENCY_IN_FACTORY = function (factoryType, serviceIdentifier) {
        return "It looks like there is a circular dependency in one of the '" + factoryType + "' bindings. Please investigate bindings with" +
            ("service identifier '" + serviceIdentifier + "'.");
    };
    var STACK_OVERFLOW = "Maximum call stack size exceeded";

    var MetadataReader = (function () {
        function MetadataReader() {
        }
        MetadataReader.prototype.getConstructorMetadata = function (constructorFunc) {
            var compilerGeneratedMetadata = Reflect.getMetadata(PARAM_TYPES, constructorFunc);
            var userGeneratedMetadata = Reflect.getMetadata(TAGGED, constructorFunc);
            return {
                compilerGeneratedMetadata: compilerGeneratedMetadata,
                userGeneratedMetadata: userGeneratedMetadata || {}
            };
        };
        MetadataReader.prototype.getPropertiesMetadata = function (constructorFunc) {
            var userGeneratedMetadata = Reflect.getMetadata(TAGGED_PROP, constructorFunc) || [];
            return userGeneratedMetadata;
        };
        return MetadataReader;
    }());

    var BindingCount = {
        MultipleBindingsAvailable: 2,
        NoBindingsAvailable: 0,
        OnlyOneBindingAvailable: 1
    };

    function isStackOverflowExeption(error) {
        return (error instanceof RangeError ||
            error.message === STACK_OVERFLOW);
    }
    var tryAndThrowErrorIfStackOverflow = function (fn, errorCallback) {
        try {
            return fn();
        }
        catch (error) {
            if (isStackOverflowExeption(error)) {
                error = errorCallback();
            }
            throw error;
        }
    };

    function getServiceIdentifierAsString(serviceIdentifier) {
        if (typeof serviceIdentifier === "function") {
            var _serviceIdentifier = serviceIdentifier;
            return _serviceIdentifier.name;
        }
        else if (typeof serviceIdentifier === "symbol") {
            return serviceIdentifier.toString();
        }
        else {
            var _serviceIdentifier = serviceIdentifier;
            return _serviceIdentifier;
        }
    }
    function listRegisteredBindingsForServiceIdentifier(container, serviceIdentifier, getBindings) {
        var registeredBindingsList = "";
        var registeredBindings = getBindings(container, serviceIdentifier);
        if (registeredBindings.length !== 0) {
            registeredBindingsList = "\nRegistered bindings:";
            registeredBindings.forEach(function (binding) {
                var name = "Object";
                if (binding.implementationType !== null) {
                    name = getFunctionName(binding.implementationType);
                }
                registeredBindingsList = registeredBindingsList + "\n " + name;
                if (binding.constraint.metaData) {
                    registeredBindingsList = registeredBindingsList + " - " + binding.constraint.metaData;
                }
            });
        }
        return registeredBindingsList;
    }
    function alreadyDependencyChain(request, serviceIdentifier) {
        if (request.parentRequest === null) {
            return false;
        }
        else if (request.parentRequest.serviceIdentifier === serviceIdentifier) {
            return true;
        }
        else {
            return alreadyDependencyChain(request.parentRequest, serviceIdentifier);
        }
    }
    function dependencyChainToString(request) {
        function _createStringArr(req, result) {
            if (result === void 0) { result = []; }
            var serviceIdentifier = getServiceIdentifierAsString(req.serviceIdentifier);
            result.push(serviceIdentifier);
            if (req.parentRequest !== null) {
                return _createStringArr(req.parentRequest, result);
            }
            return result;
        }
        var stringArr = _createStringArr(request);
        return stringArr.reverse().join(" --> ");
    }
    function circularDependencyToException(request) {
        request.childRequests.forEach(function (childRequest) {
            if (alreadyDependencyChain(childRequest, childRequest.serviceIdentifier)) {
                var services = dependencyChainToString(childRequest);
                throw new Error(CIRCULAR_DEPENDENCY + " " + services);
            }
            else {
                circularDependencyToException(childRequest);
            }
        });
    }
    function listMetadataForTarget(serviceIdentifierString, target) {
        if (target.isTagged() || target.isNamed()) {
            var m_1 = "";
            var namedTag = target.getNamedTag();
            var otherTags = target.getCustomTags();
            if (namedTag !== null) {
                m_1 += namedTag.toString() + "\n";
            }
            if (otherTags !== null) {
                otherTags.forEach(function (tag) {
                    m_1 += tag.toString() + "\n";
                });
            }
            return " " + serviceIdentifierString + "\n " + serviceIdentifierString + " - " + m_1;
        }
        else {
            return " " + serviceIdentifierString;
        }
    }
    function getFunctionName(func) {
        if (func.name) {
            return func.name;
        }
        else {
            var name_1 = func.toString();
            var match = name_1.match(/^function\s*([^\s(]+)/);
            return match ? match[1] : "Anonymous function: " + name_1;
        }
    }
    function getSymbolDescription(symbol) {
        return symbol.toString().slice(7, -1);
    }

    var Context = (function () {
        function Context(container) {
            this.id = id();
            this.container = container;
        }
        Context.prototype.addPlan = function (plan) {
            this.plan = plan;
        };
        Context.prototype.setCurrentRequest = function (currentRequest) {
            this.currentRequest = currentRequest;
        };
        return Context;
    }());

    var Metadata = (function () {
        function Metadata(key, value) {
            this.key = key;
            this.value = value;
        }
        Metadata.prototype.toString = function () {
            if (this.key === NAMED_TAG) {
                return "named: " + String(this.value).toString() + " ";
            }
            else {
                return "tagged: { key:" + this.key.toString() + ", value: " + String(this.value) + " }";
            }
        };
        return Metadata;
    }());

    var Plan = (function () {
        function Plan(parentContext, rootRequest) {
            this.parentContext = parentContext;
            this.rootRequest = rootRequest;
        }
        return Plan;
    }());

    var LazyServiceIdentifer = (function () {
        function LazyServiceIdentifer(cb) {
            this._cb = cb;
        }
        LazyServiceIdentifer.prototype.unwrap = function () {
            return this._cb();
        };
        return LazyServiceIdentifer;
    }());

    var QueryableString = (function () {
        function QueryableString(str) {
            this.str = str;
        }
        QueryableString.prototype.startsWith = function (searchString) {
            return this.str.indexOf(searchString) === 0;
        };
        QueryableString.prototype.endsWith = function (searchString) {
            var reverseString = "";
            var reverseSearchString = searchString.split("").reverse().join("");
            reverseString = this.str.split("").reverse().join("");
            return this.startsWith.call({ str: reverseString }, reverseSearchString);
        };
        QueryableString.prototype.contains = function (searchString) {
            return (this.str.indexOf(searchString) !== -1);
        };
        QueryableString.prototype.equals = function (compareString) {
            return this.str === compareString;
        };
        QueryableString.prototype.value = function () {
            return this.str;
        };
        return QueryableString;
    }());

    var Target = (function () {
        function Target(type, identifier, serviceIdentifier, namedOrTagged) {
            this.id = id();
            this.type = type;
            this.serviceIdentifier = serviceIdentifier;
            var queryableName = typeof identifier === 'symbol' ? getSymbolDescription(identifier) : identifier;
            this.name = new QueryableString(queryableName || "");
            this.identifier = identifier;
            this.metadata = new Array();
            var metadataItem = null;
            if (typeof namedOrTagged === 'string') {
                metadataItem = new Metadata(NAMED_TAG, namedOrTagged);
            }
            else if (namedOrTagged instanceof Metadata) {
                metadataItem = namedOrTagged;
            }
            if (metadataItem !== null) {
                this.metadata.push(metadataItem);
            }
        }
        Target.prototype.hasTag = function (key) {
            for (var _i = 0, _a = this.metadata; _i < _a.length; _i++) {
                var m = _a[_i];
                if (m.key === key) {
                    return true;
                }
            }
            return false;
        };
        Target.prototype.isArray = function () {
            return this.hasTag(MULTI_INJECT_TAG);
        };
        Target.prototype.matchesArray = function (name) {
            return this.matchesTag(MULTI_INJECT_TAG)(name);
        };
        Target.prototype.isNamed = function () {
            return this.hasTag(NAMED_TAG);
        };
        Target.prototype.isTagged = function () {
            return this.metadata.some(function (metadata) { return NON_CUSTOM_TAG_KEYS.every(function (key) { return metadata.key !== key; }); });
        };
        Target.prototype.isOptional = function () {
            return this.matchesTag(OPTIONAL_TAG)(true);
        };
        Target.prototype.getNamedTag = function () {
            if (this.isNamed()) {
                return this.metadata.filter(function (m) { return m.key === NAMED_TAG; })[0];
            }
            return null;
        };
        Target.prototype.getCustomTags = function () {
            if (this.isTagged()) {
                return this.metadata.filter(function (metadata) { return NON_CUSTOM_TAG_KEYS.every(function (key) { return metadata.key !== key; }); });
            }
            else {
                return null;
            }
        };
        Target.prototype.matchesNamedTag = function (name) {
            return this.matchesTag(NAMED_TAG)(name);
        };
        Target.prototype.matchesTag = function (key) {
            var _this = this;
            return function (value) {
                for (var _i = 0, _a = _this.metadata; _i < _a.length; _i++) {
                    var m = _a[_i];
                    if (m.key === key && m.value === value) {
                        return true;
                    }
                }
                return false;
            };
        };
        return Target;
    }());

    var __spreadArray$2 = (undefined && undefined.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    function getDependencies(metadataReader, func) {
        var constructorName = getFunctionName(func);
        return getTargets(metadataReader, constructorName, func, false);
    }
    function getTargets(metadataReader, constructorName, func, isBaseClass) {
        var metadata = metadataReader.getConstructorMetadata(func);
        var serviceIdentifiers = metadata.compilerGeneratedMetadata;
        if (serviceIdentifiers === undefined) {
            var msg = MISSING_INJECTABLE_ANNOTATION + " " + constructorName + ".";
            throw new Error(msg);
        }
        var constructorArgsMetadata = metadata.userGeneratedMetadata;
        var keys = Object.keys(constructorArgsMetadata);
        var hasUserDeclaredUnknownInjections = (func.length === 0 && keys.length > 0);
        var hasOptionalParameters = keys.length > func.length;
        var iterations = (hasUserDeclaredUnknownInjections || hasOptionalParameters) ? keys.length : func.length;
        var constructorTargets = getConstructorArgsAsTargets(isBaseClass, constructorName, serviceIdentifiers, constructorArgsMetadata, iterations);
        var propertyTargets = getClassPropsAsTargets(metadataReader, func, constructorName);
        var targets = __spreadArray$2(__spreadArray$2([], constructorTargets, true), propertyTargets, true);
        return targets;
    }
    function getConstructorArgsAsTarget(index, isBaseClass, constructorName, serviceIdentifiers, constructorArgsMetadata) {
        var targetMetadata = constructorArgsMetadata[index.toString()] || [];
        var metadata = formatTargetMetadata(targetMetadata);
        var isManaged = metadata.unmanaged !== true;
        var serviceIdentifier = serviceIdentifiers[index];
        var injectIdentifier = (metadata.inject || metadata.multiInject);
        serviceIdentifier = (injectIdentifier) ? (injectIdentifier) : serviceIdentifier;
        if (serviceIdentifier instanceof LazyServiceIdentifer) {
            serviceIdentifier = serviceIdentifier.unwrap();
        }
        if (isManaged) {
            var isObject = serviceIdentifier === Object;
            var isFunction = serviceIdentifier === Function;
            var isUndefined = serviceIdentifier === undefined;
            var isUnknownType = (isObject || isFunction || isUndefined);
            if (!isBaseClass && isUnknownType) {
                var msg = MISSING_INJECT_ANNOTATION + " argument " + index + " in class " + constructorName + ".";
                throw new Error(msg);
            }
            var target = new Target(TargetTypeEnum.ConstructorArgument, metadata.targetName, serviceIdentifier);
            target.metadata = targetMetadata;
            return target;
        }
        return null;
    }
    function getConstructorArgsAsTargets(isBaseClass, constructorName, serviceIdentifiers, constructorArgsMetadata, iterations) {
        var targets = [];
        for (var i = 0; i < iterations; i++) {
            var index = i;
            var target = getConstructorArgsAsTarget(index, isBaseClass, constructorName, serviceIdentifiers, constructorArgsMetadata);
            if (target !== null) {
                targets.push(target);
            }
        }
        return targets;
    }
    function _getServiceIdentifierForProperty(inject, multiInject, propertyName, className) {
        var serviceIdentifier = (inject || multiInject);
        if (serviceIdentifier === undefined) {
            var msg = MISSING_INJECTABLE_ANNOTATION + " for property " + String(propertyName) + " in class " + className + ".";
            throw new Error(msg);
        }
        return serviceIdentifier;
    }
    function getClassPropsAsTargets(metadataReader, constructorFunc, constructorName) {
        var classPropsMetadata = metadataReader.getPropertiesMetadata(constructorFunc);
        var targets = [];
        var symbolKeys = Object.getOwnPropertySymbols(classPropsMetadata);
        var stringKeys = Object.keys(classPropsMetadata);
        var keys = stringKeys.concat(symbolKeys);
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            var targetMetadata = classPropsMetadata[key];
            var metadata = formatTargetMetadata(targetMetadata);
            var identifier = metadata.targetName || key;
            var serviceIdentifier = _getServiceIdentifierForProperty(metadata.inject, metadata.multiInject, key, constructorName);
            var target = new Target(TargetTypeEnum.ClassProperty, identifier, serviceIdentifier);
            target.metadata = targetMetadata;
            targets.push(target);
        }
        var baseConstructor = Object.getPrototypeOf(constructorFunc.prototype).constructor;
        if (baseConstructor !== Object) {
            var baseTargets = getClassPropsAsTargets(metadataReader, baseConstructor, constructorName);
            targets = __spreadArray$2(__spreadArray$2([], targets, true), baseTargets, true);
        }
        return targets;
    }
    function getBaseClassDependencyCount(metadataReader, func) {
        var baseConstructor = Object.getPrototypeOf(func.prototype).constructor;
        if (baseConstructor !== Object) {
            var baseConstructorName = getFunctionName(baseConstructor);
            var targets = getTargets(metadataReader, baseConstructorName, baseConstructor, true);
            var metadata = targets.map(function (t) { return t.metadata.filter(function (m) { return m.key === UNMANAGED_TAG; }); });
            var unmanagedCount = [].concat.apply([], metadata).length;
            var dependencyCount = targets.length - unmanagedCount;
            if (dependencyCount > 0) {
                return dependencyCount;
            }
            else {
                return getBaseClassDependencyCount(metadataReader, baseConstructor);
            }
        }
        else {
            return 0;
        }
    }
    function formatTargetMetadata(targetMetadata) {
        var targetMetadataMap = {};
        targetMetadata.forEach(function (m) {
            targetMetadataMap[m.key.toString()] = m.value;
        });
        return {
            inject: targetMetadataMap[INJECT_TAG],
            multiInject: targetMetadataMap[MULTI_INJECT_TAG],
            targetName: targetMetadataMap[NAME_TAG],
            unmanaged: targetMetadataMap[UNMANAGED_TAG]
        };
    }

    var Request = (function () {
        function Request(serviceIdentifier, parentContext, parentRequest, bindings, target) {
            this.id = id();
            this.serviceIdentifier = serviceIdentifier;
            this.parentContext = parentContext;
            this.parentRequest = parentRequest;
            this.target = target;
            this.childRequests = [];
            this.bindings = (Array.isArray(bindings) ? bindings : [bindings]);
            this.requestScope = parentRequest === null
                ? new Map()
                : null;
        }
        Request.prototype.addChildRequest = function (serviceIdentifier, bindings, target) {
            var child = new Request(serviceIdentifier, this.parentContext, this, bindings, target);
            this.childRequests.push(child);
            return child;
        };
        return Request;
    }());

    function getBindingDictionary(cntnr) {
        return cntnr._bindingDictionary;
    }
    function _createTarget(isMultiInject, targetType, serviceIdentifier, name, key, value) {
        var metadataKey = isMultiInject ? MULTI_INJECT_TAG : INJECT_TAG;
        var injectMetadata = new Metadata(metadataKey, serviceIdentifier);
        var target = new Target(targetType, name, serviceIdentifier, injectMetadata);
        if (key !== undefined) {
            var tagMetadata = new Metadata(key, value);
            target.metadata.push(tagMetadata);
        }
        return target;
    }
    function _getActiveBindings(metadataReader, avoidConstraints, context, parentRequest, target) {
        var bindings = getBindings(context.container, target.serviceIdentifier);
        var activeBindings = [];
        if (bindings.length === BindingCount.NoBindingsAvailable &&
            context.container.options.autoBindInjectable &&
            typeof target.serviceIdentifier === "function" &&
            metadataReader.getConstructorMetadata(target.serviceIdentifier).compilerGeneratedMetadata) {
            context.container.bind(target.serviceIdentifier).toSelf();
            bindings = getBindings(context.container, target.serviceIdentifier);
        }
        if (!avoidConstraints) {
            activeBindings = bindings.filter(function (binding) {
                var request = new Request(binding.serviceIdentifier, context, parentRequest, binding, target);
                return binding.constraint(request);
            });
        }
        else {
            activeBindings = bindings;
        }
        _validateActiveBindingCount(target.serviceIdentifier, activeBindings, target, context.container);
        return activeBindings;
    }
    function _validateActiveBindingCount(serviceIdentifier, bindings, target, container) {
        switch (bindings.length) {
            case BindingCount.NoBindingsAvailable:
                if (target.isOptional()) {
                    return bindings;
                }
                else {
                    var serviceIdentifierString = getServiceIdentifierAsString(serviceIdentifier);
                    var msg = NOT_REGISTERED;
                    msg += listMetadataForTarget(serviceIdentifierString, target);
                    msg += listRegisteredBindingsForServiceIdentifier(container, serviceIdentifierString, getBindings);
                    throw new Error(msg);
                }
            case BindingCount.OnlyOneBindingAvailable:
                return bindings;
            case BindingCount.MultipleBindingsAvailable:
            default:
                if (!target.isArray()) {
                    var serviceIdentifierString = getServiceIdentifierAsString(serviceIdentifier);
                    var msg = AMBIGUOUS_MATCH + " " + serviceIdentifierString;
                    msg += listRegisteredBindingsForServiceIdentifier(container, serviceIdentifierString, getBindings);
                    throw new Error(msg);
                }
                else {
                    return bindings;
                }
        }
    }
    function _createSubRequests(metadataReader, avoidConstraints, serviceIdentifier, context, parentRequest, target) {
        var activeBindings;
        var childRequest;
        if (parentRequest === null) {
            activeBindings = _getActiveBindings(metadataReader, avoidConstraints, context, null, target);
            childRequest = new Request(serviceIdentifier, context, null, activeBindings, target);
            var thePlan = new Plan(context, childRequest);
            context.addPlan(thePlan);
        }
        else {
            activeBindings = _getActiveBindings(metadataReader, avoidConstraints, context, parentRequest, target);
            childRequest = parentRequest.addChildRequest(target.serviceIdentifier, activeBindings, target);
        }
        activeBindings.forEach(function (binding) {
            var subChildRequest = null;
            if (target.isArray()) {
                subChildRequest = childRequest.addChildRequest(binding.serviceIdentifier, binding, target);
            }
            else {
                if (binding.cache) {
                    return;
                }
                subChildRequest = childRequest;
            }
            if (binding.type === BindingTypeEnum.Instance && binding.implementationType !== null) {
                var dependencies = getDependencies(metadataReader, binding.implementationType);
                if (!context.container.options.skipBaseClassChecks) {
                    var baseClassDependencyCount = getBaseClassDependencyCount(metadataReader, binding.implementationType);
                    if (dependencies.length < baseClassDependencyCount) {
                        var error = ARGUMENTS_LENGTH_MISMATCH(getFunctionName(binding.implementationType));
                        throw new Error(error);
                    }
                }
                dependencies.forEach(function (dependency) {
                    _createSubRequests(metadataReader, false, dependency.serviceIdentifier, context, subChildRequest, dependency);
                });
            }
        });
    }
    function getBindings(container, serviceIdentifier) {
        var bindings = [];
        var bindingDictionary = getBindingDictionary(container);
        if (bindingDictionary.hasKey(serviceIdentifier)) {
            bindings = bindingDictionary.get(serviceIdentifier);
        }
        else if (container.parent !== null) {
            bindings = getBindings(container.parent, serviceIdentifier);
        }
        return bindings;
    }
    function plan(metadataReader, container, isMultiInject, targetType, serviceIdentifier, key, value, avoidConstraints) {
        if (avoidConstraints === void 0) { avoidConstraints = false; }
        var context = new Context(container);
        var target = _createTarget(isMultiInject, targetType, serviceIdentifier, "", key, value);
        try {
            _createSubRequests(metadataReader, avoidConstraints, serviceIdentifier, context, null, target);
            return context;
        }
        catch (error) {
            if (isStackOverflowExeption(error)) {
                circularDependencyToException(context.plan.rootRequest);
            }
            throw error;
        }
    }
    function createMockRequest(container, serviceIdentifier, key, value) {
        var target = new Target(TargetTypeEnum.Variable, "", serviceIdentifier, new Metadata(key, value));
        var context = new Context(container);
        var request = new Request(serviceIdentifier, context, null, [], target);
        return request;
    }

    function isPromise(object) {
        var isObjectOrFunction = (typeof object === 'object' && object !== null) || typeof object === 'function';
        return isObjectOrFunction && typeof object.then === "function";
    }
    function isPromiseOrContainsPromise(object) {
        if (isPromise(object)) {
            return true;
        }
        return Array.isArray(object) && object.some(isPromise);
    }

    var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$3 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var tryGetFromScope = function (requestScope, binding) {
        if ((binding.scope === BindingScopeEnum.Singleton) && binding.activated) {
            return binding.cache;
        }
        if (binding.scope === BindingScopeEnum.Request &&
            requestScope.has(binding.id)) {
            return requestScope.get(binding.id);
        }
        return null;
    };
    var saveToScope = function (requestScope, binding, result) {
        if (binding.scope === BindingScopeEnum.Singleton) {
            _saveToSingletonScope(binding, result);
        }
        if (binding.scope === BindingScopeEnum.Request) {
            _saveToRequestScope(requestScope, binding, result);
        }
    };
    var _saveToRequestScope = function (requestScope, binding, result) {
        if (!requestScope.has(binding.id)) {
            requestScope.set(binding.id, result);
        }
    };
    var _saveToSingletonScope = function (binding, result) {
        binding.cache = result;
        binding.activated = true;
        if (isPromise(result)) {
            void _saveAsyncResultToSingletonScope(binding, result);
        }
    };
    var _saveAsyncResultToSingletonScope = function (binding, asyncResult) { return __awaiter$3(void 0, void 0, void 0, function () {
        var result, ex_1;
        return __generator$3(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4, asyncResult];
                case 1:
                    result = _a.sent();
                    binding.cache = result;
                    return [3, 3];
                case 2:
                    ex_1 = _a.sent();
                    binding.cache = null;
                    binding.activated = false;
                    throw ex_1;
                case 3: return [2];
            }
        });
    }); };

    var FactoryType;
    (function (FactoryType) {
        FactoryType["DynamicValue"] = "toDynamicValue";
        FactoryType["Factory"] = "toFactory";
        FactoryType["Provider"] = "toProvider";
    })(FactoryType || (FactoryType = {}));

    var ensureFullyBound = function (binding) {
        var boundValue = null;
        switch (binding.type) {
            case BindingTypeEnum.ConstantValue:
            case BindingTypeEnum.Function:
                boundValue = binding.cache;
                break;
            case BindingTypeEnum.Constructor:
            case BindingTypeEnum.Instance:
                boundValue = binding.implementationType;
                break;
            case BindingTypeEnum.DynamicValue:
                boundValue = binding.dynamicValue;
                break;
            case BindingTypeEnum.Provider:
                boundValue = binding.provider;
                break;
            case BindingTypeEnum.Factory:
                boundValue = binding.factory;
                break;
        }
        if (boundValue === null) {
            var serviceIdentifierAsString = getServiceIdentifierAsString(binding.serviceIdentifier);
            throw new Error(INVALID_BINDING_TYPE + " " + serviceIdentifierAsString);
        }
    };
    var getFactoryDetails = function (binding) {
        switch (binding.type) {
            case BindingTypeEnum.Factory:
                return { factory: binding.factory, factoryType: FactoryType.Factory };
            case BindingTypeEnum.Provider:
                return { factory: binding.provider, factoryType: FactoryType.Provider };
            case BindingTypeEnum.DynamicValue:
                return { factory: binding.dynamicValue, factoryType: FactoryType.DynamicValue };
            default:
                throw new Error("Unexpected factory type " + binding.type);
        }
    };

    var __assign$1 = (undefined && undefined.__assign) || function () {
        __assign$1 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$1.apply(this, arguments);
    };
    var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$2 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var __spreadArray$1 = (undefined && undefined.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    function _resolveRequests(childRequests, resolveRequest) {
        return childRequests.reduce(function (resolvedRequests, childRequest) {
            var injection = resolveRequest(childRequest);
            var targetType = childRequest.target.type;
            if (targetType === TargetTypeEnum.ConstructorArgument) {
                resolvedRequests.constructorInjections.push(injection);
            }
            else {
                resolvedRequests.propertyRequests.push(childRequest);
                resolvedRequests.propertyInjections.push(injection);
            }
            if (!resolvedRequests.isAsync) {
                resolvedRequests.isAsync = isPromiseOrContainsPromise(injection);
            }
            return resolvedRequests;
        }, { constructorInjections: [], propertyInjections: [], propertyRequests: [], isAsync: false });
    }
    function _createInstance(constr, childRequests, resolveRequest) {
        var result;
        if (childRequests.length > 0) {
            var resolved = _resolveRequests(childRequests, resolveRequest);
            var createInstanceWithInjectionsArg = __assign$1(__assign$1({}, resolved), { constr: constr });
            if (resolved.isAsync) {
                result = createInstanceWithInjectionsAsync(createInstanceWithInjectionsArg);
            }
            else {
                result = createInstanceWithInjections(createInstanceWithInjectionsArg);
            }
        }
        else {
            result = new constr();
        }
        return result;
    }
    function createInstanceWithInjections(args) {
        var _a;
        var instance = new ((_a = args.constr).bind.apply(_a, __spreadArray$1([void 0], args.constructorInjections, false)))();
        args.propertyRequests.forEach(function (r, index) {
            var property = r.target.identifier;
            var injection = args.propertyInjections[index];
            instance[property] = injection;
        });
        return instance;
    }
    function createInstanceWithInjectionsAsync(args) {
        return __awaiter$2(this, void 0, void 0, function () {
            var constructorInjections, propertyInjections;
            return __generator$2(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, possiblyWaitInjections(args.constructorInjections)];
                    case 1:
                        constructorInjections = _a.sent();
                        return [4, possiblyWaitInjections(args.propertyInjections)];
                    case 2:
                        propertyInjections = _a.sent();
                        return [2, createInstanceWithInjections(__assign$1(__assign$1({}, args), { constructorInjections: constructorInjections, propertyInjections: propertyInjections }))];
                }
            });
        });
    }
    function possiblyWaitInjections(possiblePromiseinjections) {
        return __awaiter$2(this, void 0, void 0, function () {
            var injections, _i, possiblePromiseinjections_1, injection;
            return __generator$2(this, function (_a) {
                injections = [];
                for (_i = 0, possiblePromiseinjections_1 = possiblePromiseinjections; _i < possiblePromiseinjections_1.length; _i++) {
                    injection = possiblePromiseinjections_1[_i];
                    if (Array.isArray(injection)) {
                        injections.push(Promise.all(injection));
                    }
                    else {
                        injections.push(injection);
                    }
                }
                return [2, Promise.all(injections)];
            });
        });
    }
    function _getInstanceAfterPostConstruct(constr, result) {
        var postConstructResult = _postConstruct(constr, result);
        if (isPromise(postConstructResult)) {
            return postConstructResult.then(function () { return result; });
        }
        else {
            return result;
        }
    }
    function _postConstruct(constr, instance) {
        var _a, _b;
        if (Reflect.hasMetadata(POST_CONSTRUCT, constr)) {
            var data = Reflect.getMetadata(POST_CONSTRUCT, constr);
            try {
                return (_b = (_a = instance)[data.value]) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
            catch (e) {
                throw new Error(POST_CONSTRUCT_ERROR(constr.name, e.message));
            }
        }
    }
    function _validateInstanceResolution(binding, constr) {
        if (binding.scope !== BindingScopeEnum.Singleton) {
            _throwIfHandlingDeactivation(binding, constr);
        }
    }
    function _throwIfHandlingDeactivation(binding, constr) {
        var scopeErrorMessage = "Class cannot be instantiated in " + (binding.scope === BindingScopeEnum.Request ?
            "request" :
            "transient") + " scope.";
        if (typeof binding.onDeactivation === "function") {
            throw new Error(ON_DEACTIVATION_ERROR(constr.name, scopeErrorMessage));
        }
        if (Reflect.hasMetadata(PRE_DESTROY, constr)) {
            throw new Error(PRE_DESTROY_ERROR(constr.name, scopeErrorMessage));
        }
    }
    function resolveInstance(binding, constr, childRequests, resolveRequest) {
        _validateInstanceResolution(binding, constr);
        var result = _createInstance(constr, childRequests, resolveRequest);
        if (isPromise(result)) {
            return result.then(function (resolvedResult) { return _getInstanceAfterPostConstruct(constr, resolvedResult); });
        }
        else {
            return _getInstanceAfterPostConstruct(constr, result);
        }
    }

    var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$1 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var _resolveRequest = function (requestScope) {
        return function (request) {
            request.parentContext.setCurrentRequest(request);
            var bindings = request.bindings;
            var childRequests = request.childRequests;
            var targetIsAnArray = request.target && request.target.isArray();
            var targetParentIsNotAnArray = !request.parentRequest ||
                !request.parentRequest.target ||
                !request.target ||
                !request.parentRequest.target.matchesArray(request.target.serviceIdentifier);
            if (targetIsAnArray && targetParentIsNotAnArray) {
                return childRequests.map(function (childRequest) {
                    var _f = _resolveRequest(requestScope);
                    return _f(childRequest);
                });
            }
            else {
                if (request.target.isOptional() && bindings.length === 0) {
                    return undefined;
                }
                var binding = bindings[0];
                return _resolveBinding(requestScope, request, binding);
            }
        };
    };
    var _resolveFactoryFromBinding = function (binding, context) {
        var factoryDetails = getFactoryDetails(binding);
        return tryAndThrowErrorIfStackOverflow(function () { return factoryDetails.factory.bind(binding)(context); }, function () { return new Error(CIRCULAR_DEPENDENCY_IN_FACTORY(factoryDetails.factoryType, context.currentRequest.serviceIdentifier.toString())); });
    };
    var _getResolvedFromBinding = function (requestScope, request, binding) {
        var result;
        var childRequests = request.childRequests;
        ensureFullyBound(binding);
        switch (binding.type) {
            case BindingTypeEnum.ConstantValue:
            case BindingTypeEnum.Function:
                result = binding.cache;
                break;
            case BindingTypeEnum.Constructor:
                result = binding.implementationType;
                break;
            case BindingTypeEnum.Instance:
                result = resolveInstance(binding, binding.implementationType, childRequests, _resolveRequest(requestScope));
                break;
            default:
                result = _resolveFactoryFromBinding(binding, request.parentContext);
        }
        return result;
    };
    var _resolveInScope = function (requestScope, binding, resolveFromBinding) {
        var result = tryGetFromScope(requestScope, binding);
        if (result !== null) {
            return result;
        }
        result = resolveFromBinding();
        saveToScope(requestScope, binding, result);
        return result;
    };
    var _resolveBinding = function (requestScope, request, binding) {
        return _resolveInScope(requestScope, binding, function () {
            var result = _getResolvedFromBinding(requestScope, request, binding);
            if (isPromise(result)) {
                result = result.then(function (resolved) { return _onActivation(request, binding, resolved); });
            }
            else {
                result = _onActivation(request, binding, result);
            }
            return result;
        });
    };
    function _onActivation(request, binding, resolved) {
        var result = _bindingActivation(request.parentContext, binding, resolved);
        var containersIterator = _getContainersIterator(request.parentContext.container);
        var container;
        var containersIteratorResult = containersIterator.next();
        do {
            container = containersIteratorResult.value;
            var context_1 = request.parentContext;
            var serviceIdentifier = request.serviceIdentifier;
            var activationsIterator = _getContainerActivationsForService(container, serviceIdentifier);
            if (isPromise(result)) {
                result = _activateContainerAsync(activationsIterator, context_1, result);
            }
            else {
                result = _activateContainer(activationsIterator, context_1, result);
            }
            containersIteratorResult = containersIterator.next();
        } while (containersIteratorResult.done !== true && !getBindingDictionary(container).hasKey(request.serviceIdentifier));
        return result;
    }
    var _bindingActivation = function (context, binding, previousResult) {
        var result;
        if (typeof binding.onActivation === "function") {
            result = binding.onActivation(context, previousResult);
        }
        else {
            result = previousResult;
        }
        return result;
    };
    var _activateContainer = function (activationsIterator, context, result) {
        var activation = activationsIterator.next();
        while (!activation.done) {
            result = activation.value(context, result);
            if (isPromise(result)) {
                return _activateContainerAsync(activationsIterator, context, result);
            }
            activation = activationsIterator.next();
        }
        return result;
    };
    var _activateContainerAsync = function (activationsIterator, context, resultPromise) { return __awaiter$1(void 0, void 0, void 0, function () {
        var result, activation;
        return __generator$1(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, resultPromise];
                case 1:
                    result = _a.sent();
                    activation = activationsIterator.next();
                    _a.label = 2;
                case 2:
                    if (!!activation.done) return [3, 4];
                    return [4, activation.value(context, result)];
                case 3:
                    result = _a.sent();
                    activation = activationsIterator.next();
                    return [3, 2];
                case 4: return [2, result];
            }
        });
    }); };
    var _getContainerActivationsForService = function (container, serviceIdentifier) {
        var activations = container._activations;
        return activations.hasKey(serviceIdentifier) ? activations.get(serviceIdentifier).values() : [].values();
    };
    var _getContainersIterator = function (container) {
        var containersStack = [container];
        var parent = container.parent;
        while (parent !== null) {
            containersStack.push(parent);
            parent = parent.parent;
        }
        var getNextContainer = function () {
            var nextContainer = containersStack.pop();
            if (nextContainer !== undefined) {
                return { done: false, value: nextContainer };
            }
            else {
                return { done: true, value: undefined };
            }
        };
        var containersIterator = {
            next: getNextContainer,
        };
        return containersIterator;
    };
    function resolve(context) {
        var _f = _resolveRequest(context.plan.rootRequest.requestScope);
        return _f(context.plan.rootRequest);
    }

    var traverseAncerstors = function (request, constraint) {
        var parent = request.parentRequest;
        if (parent !== null) {
            return constraint(parent) ? true : traverseAncerstors(parent, constraint);
        }
        else {
            return false;
        }
    };
    var taggedConstraint = function (key) { return function (value) {
        var constraint = function (request) {
            return request !== null && request.target !== null && request.target.matchesTag(key)(value);
        };
        constraint.metaData = new Metadata(key, value);
        return constraint;
    }; };
    var namedConstraint = taggedConstraint(NAMED_TAG);
    var typeConstraint = function (type) { return function (request) {
        var binding = null;
        if (request !== null) {
            binding = request.bindings[0];
            if (typeof type === "string") {
                var serviceIdentifier = binding.serviceIdentifier;
                return serviceIdentifier === type;
            }
            else {
                var constructor = request.bindings[0].implementationType;
                return type === constructor;
            }
        }
        return false;
    }; };

    var BindingWhenSyntax = (function () {
        function BindingWhenSyntax(binding) {
            this._binding = binding;
        }
        BindingWhenSyntax.prototype.when = function (constraint) {
            this._binding.constraint = constraint;
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenTargetNamed = function (name) {
            this._binding.constraint = namedConstraint(name);
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenTargetIsDefault = function () {
            this._binding.constraint = function (request) {
                if (request === null) {
                    return false;
                }
                var targetIsDefault = (request.target !== null) &&
                    (!request.target.isNamed()) &&
                    (!request.target.isTagged());
                return targetIsDefault;
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenTargetTagged = function (tag, value) {
            this._binding.constraint = taggedConstraint(tag)(value);
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenInjectedInto = function (parent) {
            this._binding.constraint = function (request) {
                return request !== null && typeConstraint(parent)(request.parentRequest);
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenParentNamed = function (name) {
            this._binding.constraint = function (request) {
                return request !== null && namedConstraint(name)(request.parentRequest);
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenParentTagged = function (tag, value) {
            this._binding.constraint = function (request) {
                return request !== null && taggedConstraint(tag)(value)(request.parentRequest);
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenAnyAncestorIs = function (ancestor) {
            this._binding.constraint = function (request) {
                return request !== null && traverseAncerstors(request, typeConstraint(ancestor));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenNoAncestorIs = function (ancestor) {
            this._binding.constraint = function (request) {
                return request !== null && !traverseAncerstors(request, typeConstraint(ancestor));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenAnyAncestorNamed = function (name) {
            this._binding.constraint = function (request) {
                return request !== null && traverseAncerstors(request, namedConstraint(name));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenNoAncestorNamed = function (name) {
            this._binding.constraint = function (request) {
                return request !== null && !traverseAncerstors(request, namedConstraint(name));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenAnyAncestorTagged = function (tag, value) {
            this._binding.constraint = function (request) {
                return request !== null && traverseAncerstors(request, taggedConstraint(tag)(value));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenNoAncestorTagged = function (tag, value) {
            this._binding.constraint = function (request) {
                return request !== null && !traverseAncerstors(request, taggedConstraint(tag)(value));
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenAnyAncestorMatches = function (constraint) {
            this._binding.constraint = function (request) {
                return request !== null && traverseAncerstors(request, constraint);
            };
            return new BindingOnSyntax(this._binding);
        };
        BindingWhenSyntax.prototype.whenNoAncestorMatches = function (constraint) {
            this._binding.constraint = function (request) {
                return request !== null && !traverseAncerstors(request, constraint);
            };
            return new BindingOnSyntax(this._binding);
        };
        return BindingWhenSyntax;
    }());

    var BindingOnSyntax = (function () {
        function BindingOnSyntax(binding) {
            this._binding = binding;
        }
        BindingOnSyntax.prototype.onActivation = function (handler) {
            this._binding.onActivation = handler;
            return new BindingWhenSyntax(this._binding);
        };
        BindingOnSyntax.prototype.onDeactivation = function (handler) {
            this._binding.onDeactivation = handler;
            return new BindingWhenSyntax(this._binding);
        };
        return BindingOnSyntax;
    }());

    var BindingWhenOnSyntax = (function () {
        function BindingWhenOnSyntax(binding) {
            this._binding = binding;
            this._bindingWhenSyntax = new BindingWhenSyntax(this._binding);
            this._bindingOnSyntax = new BindingOnSyntax(this._binding);
        }
        BindingWhenOnSyntax.prototype.when = function (constraint) {
            return this._bindingWhenSyntax.when(constraint);
        };
        BindingWhenOnSyntax.prototype.whenTargetNamed = function (name) {
            return this._bindingWhenSyntax.whenTargetNamed(name);
        };
        BindingWhenOnSyntax.prototype.whenTargetIsDefault = function () {
            return this._bindingWhenSyntax.whenTargetIsDefault();
        };
        BindingWhenOnSyntax.prototype.whenTargetTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenTargetTagged(tag, value);
        };
        BindingWhenOnSyntax.prototype.whenInjectedInto = function (parent) {
            return this._bindingWhenSyntax.whenInjectedInto(parent);
        };
        BindingWhenOnSyntax.prototype.whenParentNamed = function (name) {
            return this._bindingWhenSyntax.whenParentNamed(name);
        };
        BindingWhenOnSyntax.prototype.whenParentTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenParentTagged(tag, value);
        };
        BindingWhenOnSyntax.prototype.whenAnyAncestorIs = function (ancestor) {
            return this._bindingWhenSyntax.whenAnyAncestorIs(ancestor);
        };
        BindingWhenOnSyntax.prototype.whenNoAncestorIs = function (ancestor) {
            return this._bindingWhenSyntax.whenNoAncestorIs(ancestor);
        };
        BindingWhenOnSyntax.prototype.whenAnyAncestorNamed = function (name) {
            return this._bindingWhenSyntax.whenAnyAncestorNamed(name);
        };
        BindingWhenOnSyntax.prototype.whenAnyAncestorTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenAnyAncestorTagged(tag, value);
        };
        BindingWhenOnSyntax.prototype.whenNoAncestorNamed = function (name) {
            return this._bindingWhenSyntax.whenNoAncestorNamed(name);
        };
        BindingWhenOnSyntax.prototype.whenNoAncestorTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenNoAncestorTagged(tag, value);
        };
        BindingWhenOnSyntax.prototype.whenAnyAncestorMatches = function (constraint) {
            return this._bindingWhenSyntax.whenAnyAncestorMatches(constraint);
        };
        BindingWhenOnSyntax.prototype.whenNoAncestorMatches = function (constraint) {
            return this._bindingWhenSyntax.whenNoAncestorMatches(constraint);
        };
        BindingWhenOnSyntax.prototype.onActivation = function (handler) {
            return this._bindingOnSyntax.onActivation(handler);
        };
        BindingWhenOnSyntax.prototype.onDeactivation = function (handler) {
            return this._bindingOnSyntax.onDeactivation(handler);
        };
        return BindingWhenOnSyntax;
    }());

    var BindingInSyntax = (function () {
        function BindingInSyntax(binding) {
            this._binding = binding;
        }
        BindingInSyntax.prototype.inRequestScope = function () {
            this._binding.scope = BindingScopeEnum.Request;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingInSyntax.prototype.inSingletonScope = function () {
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingInSyntax.prototype.inTransientScope = function () {
            this._binding.scope = BindingScopeEnum.Transient;
            return new BindingWhenOnSyntax(this._binding);
        };
        return BindingInSyntax;
    }());

    var BindingInWhenOnSyntax = (function () {
        function BindingInWhenOnSyntax(binding) {
            this._binding = binding;
            this._bindingWhenSyntax = new BindingWhenSyntax(this._binding);
            this._bindingOnSyntax = new BindingOnSyntax(this._binding);
            this._bindingInSyntax = new BindingInSyntax(binding);
        }
        BindingInWhenOnSyntax.prototype.inRequestScope = function () {
            return this._bindingInSyntax.inRequestScope();
        };
        BindingInWhenOnSyntax.prototype.inSingletonScope = function () {
            return this._bindingInSyntax.inSingletonScope();
        };
        BindingInWhenOnSyntax.prototype.inTransientScope = function () {
            return this._bindingInSyntax.inTransientScope();
        };
        BindingInWhenOnSyntax.prototype.when = function (constraint) {
            return this._bindingWhenSyntax.when(constraint);
        };
        BindingInWhenOnSyntax.prototype.whenTargetNamed = function (name) {
            return this._bindingWhenSyntax.whenTargetNamed(name);
        };
        BindingInWhenOnSyntax.prototype.whenTargetIsDefault = function () {
            return this._bindingWhenSyntax.whenTargetIsDefault();
        };
        BindingInWhenOnSyntax.prototype.whenTargetTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenTargetTagged(tag, value);
        };
        BindingInWhenOnSyntax.prototype.whenInjectedInto = function (parent) {
            return this._bindingWhenSyntax.whenInjectedInto(parent);
        };
        BindingInWhenOnSyntax.prototype.whenParentNamed = function (name) {
            return this._bindingWhenSyntax.whenParentNamed(name);
        };
        BindingInWhenOnSyntax.prototype.whenParentTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenParentTagged(tag, value);
        };
        BindingInWhenOnSyntax.prototype.whenAnyAncestorIs = function (ancestor) {
            return this._bindingWhenSyntax.whenAnyAncestorIs(ancestor);
        };
        BindingInWhenOnSyntax.prototype.whenNoAncestorIs = function (ancestor) {
            return this._bindingWhenSyntax.whenNoAncestorIs(ancestor);
        };
        BindingInWhenOnSyntax.prototype.whenAnyAncestorNamed = function (name) {
            return this._bindingWhenSyntax.whenAnyAncestorNamed(name);
        };
        BindingInWhenOnSyntax.prototype.whenAnyAncestorTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenAnyAncestorTagged(tag, value);
        };
        BindingInWhenOnSyntax.prototype.whenNoAncestorNamed = function (name) {
            return this._bindingWhenSyntax.whenNoAncestorNamed(name);
        };
        BindingInWhenOnSyntax.prototype.whenNoAncestorTagged = function (tag, value) {
            return this._bindingWhenSyntax.whenNoAncestorTagged(tag, value);
        };
        BindingInWhenOnSyntax.prototype.whenAnyAncestorMatches = function (constraint) {
            return this._bindingWhenSyntax.whenAnyAncestorMatches(constraint);
        };
        BindingInWhenOnSyntax.prototype.whenNoAncestorMatches = function (constraint) {
            return this._bindingWhenSyntax.whenNoAncestorMatches(constraint);
        };
        BindingInWhenOnSyntax.prototype.onActivation = function (handler) {
            return this._bindingOnSyntax.onActivation(handler);
        };
        BindingInWhenOnSyntax.prototype.onDeactivation = function (handler) {
            return this._bindingOnSyntax.onDeactivation(handler);
        };
        return BindingInWhenOnSyntax;
    }());

    var BindingToSyntax = (function () {
        function BindingToSyntax(binding) {
            this._binding = binding;
        }
        BindingToSyntax.prototype.to = function (constructor) {
            this._binding.type = BindingTypeEnum.Instance;
            this._binding.implementationType = constructor;
            return new BindingInWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toSelf = function () {
            if (typeof this._binding.serviceIdentifier !== "function") {
                throw new Error("" + INVALID_TO_SELF_VALUE);
            }
            var self = this._binding.serviceIdentifier;
            return this.to(self);
        };
        BindingToSyntax.prototype.toConstantValue = function (value) {
            this._binding.type = BindingTypeEnum.ConstantValue;
            this._binding.cache = value;
            this._binding.dynamicValue = null;
            this._binding.implementationType = null;
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toDynamicValue = function (func) {
            this._binding.type = BindingTypeEnum.DynamicValue;
            this._binding.cache = null;
            this._binding.dynamicValue = func;
            this._binding.implementationType = null;
            return new BindingInWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toConstructor = function (constructor) {
            this._binding.type = BindingTypeEnum.Constructor;
            this._binding.implementationType = constructor;
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toFactory = function (factory) {
            this._binding.type = BindingTypeEnum.Factory;
            this._binding.factory = factory;
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toFunction = function (func) {
            if (typeof func !== "function") {
                throw new Error(INVALID_FUNCTION_BINDING);
            }
            var bindingWhenOnSyntax = this.toConstantValue(func);
            this._binding.type = BindingTypeEnum.Function;
            this._binding.scope = BindingScopeEnum.Singleton;
            return bindingWhenOnSyntax;
        };
        BindingToSyntax.prototype.toAutoFactory = function (serviceIdentifier) {
            this._binding.type = BindingTypeEnum.Factory;
            this._binding.factory = function (context) {
                var autofactory = function () { return context.container.get(serviceIdentifier); };
                return autofactory;
            };
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toAutoNamedFactory = function (serviceIdentifier) {
            this._binding.type = BindingTypeEnum.Factory;
            this._binding.factory = function (context) {
                return function (named) { return context.container.getNamed(serviceIdentifier, named); };
            };
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toProvider = function (provider) {
            this._binding.type = BindingTypeEnum.Provider;
            this._binding.provider = provider;
            this._binding.scope = BindingScopeEnum.Singleton;
            return new BindingWhenOnSyntax(this._binding);
        };
        BindingToSyntax.prototype.toService = function (service) {
            this.toDynamicValue(function (context) { return context.container.get(service); });
        };
        return BindingToSyntax;
    }());

    var ContainerSnapshot = (function () {
        function ContainerSnapshot() {
        }
        ContainerSnapshot.of = function (bindings, middleware, activations, deactivations, moduleActivationStore) {
            var snapshot = new ContainerSnapshot();
            snapshot.bindings = bindings;
            snapshot.middleware = middleware;
            snapshot.deactivations = deactivations;
            snapshot.activations = activations;
            snapshot.moduleActivationStore = moduleActivationStore;
            return snapshot;
        };
        return ContainerSnapshot;
    }());

    function isClonable(obj) {
        return (typeof obj === 'object')
            && (obj !== null)
            && ('clone' in obj)
            && typeof obj.clone === 'function';
    }

    var Lookup = (function () {
        function Lookup() {
            this._map = new Map();
        }
        Lookup.prototype.getMap = function () {
            return this._map;
        };
        Lookup.prototype.add = function (serviceIdentifier, value) {
            if (serviceIdentifier === null || serviceIdentifier === undefined) {
                throw new Error(NULL_ARGUMENT);
            }
            if (value === null || value === undefined) {
                throw new Error(NULL_ARGUMENT);
            }
            var entry = this._map.get(serviceIdentifier);
            if (entry !== undefined) {
                entry.push(value);
            }
            else {
                this._map.set(serviceIdentifier, [value]);
            }
        };
        Lookup.prototype.get = function (serviceIdentifier) {
            if (serviceIdentifier === null || serviceIdentifier === undefined) {
                throw new Error(NULL_ARGUMENT);
            }
            var entry = this._map.get(serviceIdentifier);
            if (entry !== undefined) {
                return entry;
            }
            else {
                throw new Error(KEY_NOT_FOUND);
            }
        };
        Lookup.prototype.remove = function (serviceIdentifier) {
            if (serviceIdentifier === null || serviceIdentifier === undefined) {
                throw new Error(NULL_ARGUMENT);
            }
            if (!this._map.delete(serviceIdentifier)) {
                throw new Error(KEY_NOT_FOUND);
            }
        };
        Lookup.prototype.removeIntersection = function (lookup) {
            var _this = this;
            this.traverse(function (serviceIdentifier, value) {
                var lookupActivations = lookup.hasKey(serviceIdentifier) ? lookup.get(serviceIdentifier) : undefined;
                if (lookupActivations !== undefined) {
                    var filteredValues = value.filter(function (lookupValue) {
                        return !lookupActivations.some(function (moduleActivation) { return lookupValue === moduleActivation; });
                    });
                    _this._setValue(serviceIdentifier, filteredValues);
                }
            });
        };
        Lookup.prototype.removeByCondition = function (condition) {
            var _this = this;
            var removals = [];
            this._map.forEach(function (entries, key) {
                var updatedEntries = [];
                for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                    var entry = entries_1[_i];
                    var remove = condition(entry);
                    if (remove) {
                        removals.push(entry);
                    }
                    else {
                        updatedEntries.push(entry);
                    }
                }
                _this._setValue(key, updatedEntries);
            });
            return removals;
        };
        Lookup.prototype.hasKey = function (serviceIdentifier) {
            if (serviceIdentifier === null || serviceIdentifier === undefined) {
                throw new Error(NULL_ARGUMENT);
            }
            return this._map.has(serviceIdentifier);
        };
        Lookup.prototype.clone = function () {
            var copy = new Lookup();
            this._map.forEach(function (value, key) {
                value.forEach(function (b) { return copy.add(key, isClonable(b) ? b.clone() : b); });
            });
            return copy;
        };
        Lookup.prototype.traverse = function (func) {
            this._map.forEach(function (value, key) {
                func(key, value);
            });
        };
        Lookup.prototype._setValue = function (serviceIdentifier, value) {
            if (value.length > 0) {
                this._map.set(serviceIdentifier, value);
            }
            else {
                this._map.delete(serviceIdentifier);
            }
        };
        return Lookup;
    }());

    var ModuleActivationStore = (function () {
        function ModuleActivationStore() {
            this._map = new Map();
        }
        ModuleActivationStore.prototype.remove = function (moduleId) {
            if (this._map.has(moduleId)) {
                var handlers = this._map.get(moduleId);
                this._map.delete(moduleId);
                return handlers;
            }
            return this._getEmptyHandlersStore();
        };
        ModuleActivationStore.prototype.addDeactivation = function (moduleId, serviceIdentifier, onDeactivation) {
            this._getModuleActivationHandlers(moduleId)
                .onDeactivations.add(serviceIdentifier, onDeactivation);
        };
        ModuleActivationStore.prototype.addActivation = function (moduleId, serviceIdentifier, onActivation) {
            this._getModuleActivationHandlers(moduleId)
                .onActivations.add(serviceIdentifier, onActivation);
        };
        ModuleActivationStore.prototype.clone = function () {
            var clone = new ModuleActivationStore();
            this._map.forEach(function (handlersStore, moduleId) {
                clone._map.set(moduleId, {
                    onActivations: handlersStore.onActivations.clone(),
                    onDeactivations: handlersStore.onDeactivations.clone(),
                });
            });
            return clone;
        };
        ModuleActivationStore.prototype._getModuleActivationHandlers = function (moduleId) {
            var moduleActivationHandlers = this._map.get(moduleId);
            if (moduleActivationHandlers === undefined) {
                moduleActivationHandlers = this._getEmptyHandlersStore();
                this._map.set(moduleId, moduleActivationHandlers);
            }
            return moduleActivationHandlers;
        };
        ModuleActivationStore.prototype._getEmptyHandlersStore = function () {
            var handlersStore = {
                onActivations: new Lookup(),
                onDeactivations: new Lookup()
            };
            return handlersStore;
        };
        return ModuleActivationStore;
    }());

    var __assign = (undefined && undefined.__assign) || function () {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    var Container = (function () {
        function Container(containerOptions) {
            var options = containerOptions || {};
            if (typeof options !== "object") {
                throw new Error("" + CONTAINER_OPTIONS_MUST_BE_AN_OBJECT);
            }
            if (options.defaultScope === undefined) {
                options.defaultScope = BindingScopeEnum.Transient;
            }
            else if (options.defaultScope !== BindingScopeEnum.Singleton &&
                options.defaultScope !== BindingScopeEnum.Transient &&
                options.defaultScope !== BindingScopeEnum.Request) {
                throw new Error("" + CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE);
            }
            if (options.autoBindInjectable === undefined) {
                options.autoBindInjectable = false;
            }
            else if (typeof options.autoBindInjectable !== "boolean") {
                throw new Error("" + CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE);
            }
            if (options.skipBaseClassChecks === undefined) {
                options.skipBaseClassChecks = false;
            }
            else if (typeof options.skipBaseClassChecks !== "boolean") {
                throw new Error("" + CONTAINER_OPTIONS_INVALID_SKIP_BASE_CHECK);
            }
            this.options = {
                autoBindInjectable: options.autoBindInjectable,
                defaultScope: options.defaultScope,
                skipBaseClassChecks: options.skipBaseClassChecks
            };
            this.id = id();
            this._bindingDictionary = new Lookup();
            this._snapshots = [];
            this._middleware = null;
            this._activations = new Lookup();
            this._deactivations = new Lookup();
            this.parent = null;
            this._metadataReader = new MetadataReader();
            this._moduleActivationStore = new ModuleActivationStore();
        }
        Container.merge = function (container1, container2) {
            var containers = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                containers[_i - 2] = arguments[_i];
            }
            var container = new Container();
            var targetContainers = __spreadArray([container1, container2], containers, true).map(function (targetContainer) { return getBindingDictionary(targetContainer); });
            var bindingDictionary = getBindingDictionary(container);
            function copyDictionary(origin, destination) {
                origin.traverse(function (_key, value) {
                    value.forEach(function (binding) {
                        destination.add(binding.serviceIdentifier, binding.clone());
                    });
                });
            }
            targetContainers.forEach(function (targetBindingDictionary) {
                copyDictionary(targetBindingDictionary, bindingDictionary);
            });
            return container;
        };
        Container.prototype.load = function () {
            var modules = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                modules[_i] = arguments[_i];
            }
            var getHelpers = this._getContainerModuleHelpersFactory();
            for (var _a = 0, modules_1 = modules; _a < modules_1.length; _a++) {
                var currentModule = modules_1[_a];
                var containerModuleHelpers = getHelpers(currentModule.id);
                currentModule.registry(containerModuleHelpers.bindFunction, containerModuleHelpers.unbindFunction, containerModuleHelpers.isboundFunction, containerModuleHelpers.rebindFunction, containerModuleHelpers.unbindAsyncFunction, containerModuleHelpers.onActivationFunction, containerModuleHelpers.onDeactivationFunction);
            }
        };
        Container.prototype.loadAsync = function () {
            var modules = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                modules[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var getHelpers, _a, modules_2, currentModule, containerModuleHelpers;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            getHelpers = this._getContainerModuleHelpersFactory();
                            _a = 0, modules_2 = modules;
                            _b.label = 1;
                        case 1:
                            if (!(_a < modules_2.length)) return [3, 4];
                            currentModule = modules_2[_a];
                            containerModuleHelpers = getHelpers(currentModule.id);
                            return [4, currentModule.registry(containerModuleHelpers.bindFunction, containerModuleHelpers.unbindFunction, containerModuleHelpers.isboundFunction, containerModuleHelpers.rebindFunction, containerModuleHelpers.unbindAsyncFunction, containerModuleHelpers.onActivationFunction, containerModuleHelpers.onDeactivationFunction)];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            _a++;
                            return [3, 1];
                        case 4: return [2];
                    }
                });
            });
        };
        Container.prototype.unload = function () {
            var _this = this;
            var modules = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                modules[_i] = arguments[_i];
            }
            modules.forEach(function (module) {
                var deactivations = _this._removeModuleBindings(module.id);
                _this._deactivateSingletons(deactivations);
                _this._removeModuleHandlers(module.id);
            });
        };
        Container.prototype.unloadAsync = function () {
            var modules = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                modules[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var _a, modules_3, module_1, deactivations;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = 0, modules_3 = modules;
                            _b.label = 1;
                        case 1:
                            if (!(_a < modules_3.length)) return [3, 4];
                            module_1 = modules_3[_a];
                            deactivations = this._removeModuleBindings(module_1.id);
                            return [4, this._deactivateSingletonsAsync(deactivations)];
                        case 2:
                            _b.sent();
                            this._removeModuleHandlers(module_1.id);
                            _b.label = 3;
                        case 3:
                            _a++;
                            return [3, 1];
                        case 4: return [2];
                    }
                });
            });
        };
        Container.prototype.bind = function (serviceIdentifier) {
            var scope = this.options.defaultScope || BindingScopeEnum.Transient;
            var binding = new Binding(serviceIdentifier, scope);
            this._bindingDictionary.add(serviceIdentifier, binding);
            return new BindingToSyntax(binding);
        };
        Container.prototype.rebind = function (serviceIdentifier) {
            this.unbind(serviceIdentifier);
            return this.bind(serviceIdentifier);
        };
        Container.prototype.rebindAsync = function (serviceIdentifier) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.unbindAsync(serviceIdentifier)];
                        case 1:
                            _a.sent();
                            return [2, this.bind(serviceIdentifier)];
                    }
                });
            });
        };
        Container.prototype.unbind = function (serviceIdentifier) {
            if (this._bindingDictionary.hasKey(serviceIdentifier)) {
                var bindings = this._bindingDictionary.get(serviceIdentifier);
                this._deactivateSingletons(bindings);
            }
            this._removeServiceFromDictionary(serviceIdentifier);
        };
        Container.prototype.unbindAsync = function (serviceIdentifier) {
            return __awaiter(this, void 0, void 0, function () {
                var bindings;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this._bindingDictionary.hasKey(serviceIdentifier)) return [3, 2];
                            bindings = this._bindingDictionary.get(serviceIdentifier);
                            return [4, this._deactivateSingletonsAsync(bindings)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            this._removeServiceFromDictionary(serviceIdentifier);
                            return [2];
                    }
                });
            });
        };
        Container.prototype.unbindAll = function () {
            var _this = this;
            this._bindingDictionary.traverse(function (_key, value) {
                _this._deactivateSingletons(value);
            });
            this._bindingDictionary = new Lookup();
        };
        Container.prototype.unbindAllAsync = function () {
            return __awaiter(this, void 0, void 0, function () {
                var promises;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            promises = [];
                            this._bindingDictionary.traverse(function (_key, value) {
                                promises.push(_this._deactivateSingletonsAsync(value));
                            });
                            return [4, Promise.all(promises)];
                        case 1:
                            _a.sent();
                            this._bindingDictionary = new Lookup();
                            return [2];
                    }
                });
            });
        };
        Container.prototype.onActivation = function (serviceIdentifier, onActivation) {
            this._activations.add(serviceIdentifier, onActivation);
        };
        Container.prototype.onDeactivation = function (serviceIdentifier, onDeactivation) {
            this._deactivations.add(serviceIdentifier, onDeactivation);
        };
        Container.prototype.isBound = function (serviceIdentifier) {
            var bound = this._bindingDictionary.hasKey(serviceIdentifier);
            if (!bound && this.parent) {
                bound = this.parent.isBound(serviceIdentifier);
            }
            return bound;
        };
        Container.prototype.isCurrentBound = function (serviceIdentifier) {
            return this._bindingDictionary.hasKey(serviceIdentifier);
        };
        Container.prototype.isBoundNamed = function (serviceIdentifier, named) {
            return this.isBoundTagged(serviceIdentifier, NAMED_TAG, named);
        };
        Container.prototype.isBoundTagged = function (serviceIdentifier, key, value) {
            var bound = false;
            if (this._bindingDictionary.hasKey(serviceIdentifier)) {
                var bindings = this._bindingDictionary.get(serviceIdentifier);
                var request_1 = createMockRequest(this, serviceIdentifier, key, value);
                bound = bindings.some(function (b) { return b.constraint(request_1); });
            }
            if (!bound && this.parent) {
                bound = this.parent.isBoundTagged(serviceIdentifier, key, value);
            }
            return bound;
        };
        Container.prototype.snapshot = function () {
            this._snapshots.push(ContainerSnapshot.of(this._bindingDictionary.clone(), this._middleware, this._activations.clone(), this._deactivations.clone(), this._moduleActivationStore.clone()));
        };
        Container.prototype.restore = function () {
            var snapshot = this._snapshots.pop();
            if (snapshot === undefined) {
                throw new Error(NO_MORE_SNAPSHOTS_AVAILABLE);
            }
            this._bindingDictionary = snapshot.bindings;
            this._activations = snapshot.activations;
            this._deactivations = snapshot.deactivations;
            this._middleware = snapshot.middleware;
            this._moduleActivationStore = snapshot.moduleActivationStore;
        };
        Container.prototype.createChild = function (containerOptions) {
            var child = new Container(containerOptions || this.options);
            child.parent = this;
            return child;
        };
        Container.prototype.applyMiddleware = function () {
            var middlewares = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                middlewares[_i] = arguments[_i];
            }
            var initial = (this._middleware) ? this._middleware : this._planAndResolve();
            this._middleware = middlewares.reduce(function (prev, curr) { return curr(prev); }, initial);
        };
        Container.prototype.applyCustomMetadataReader = function (metadataReader) {
            this._metadataReader = metadataReader;
        };
        Container.prototype.get = function (serviceIdentifier) {
            var getArgs = this._getNotAllArgs(serviceIdentifier, false);
            return this._getButThrowIfAsync(getArgs);
        };
        Container.prototype.getAsync = function (serviceIdentifier) {
            return __awaiter(this, void 0, void 0, function () {
                var getArgs;
                return __generator(this, function (_a) {
                    getArgs = this._getNotAllArgs(serviceIdentifier, false);
                    return [2, this._get(getArgs)];
                });
            });
        };
        Container.prototype.getTagged = function (serviceIdentifier, key, value) {
            var getArgs = this._getNotAllArgs(serviceIdentifier, false, key, value);
            return this._getButThrowIfAsync(getArgs);
        };
        Container.prototype.getTaggedAsync = function (serviceIdentifier, key, value) {
            return __awaiter(this, void 0, void 0, function () {
                var getArgs;
                return __generator(this, function (_a) {
                    getArgs = this._getNotAllArgs(serviceIdentifier, false, key, value);
                    return [2, this._get(getArgs)];
                });
            });
        };
        Container.prototype.getNamed = function (serviceIdentifier, named) {
            return this.getTagged(serviceIdentifier, NAMED_TAG, named);
        };
        Container.prototype.getNamedAsync = function (serviceIdentifier, named) {
            return this.getTaggedAsync(serviceIdentifier, NAMED_TAG, named);
        };
        Container.prototype.getAll = function (serviceIdentifier) {
            var getArgs = this._getAllArgs(serviceIdentifier);
            return this._getButThrowIfAsync(getArgs);
        };
        Container.prototype.getAllAsync = function (serviceIdentifier) {
            var getArgs = this._getAllArgs(serviceIdentifier);
            return this._getAll(getArgs);
        };
        Container.prototype.getAllTagged = function (serviceIdentifier, key, value) {
            var getArgs = this._getNotAllArgs(serviceIdentifier, true, key, value);
            return this._getButThrowIfAsync(getArgs);
        };
        Container.prototype.getAllTaggedAsync = function (serviceIdentifier, key, value) {
            var getArgs = this._getNotAllArgs(serviceIdentifier, true, key, value);
            return this._getAll(getArgs);
        };
        Container.prototype.getAllNamed = function (serviceIdentifier, named) {
            return this.getAllTagged(serviceIdentifier, NAMED_TAG, named);
        };
        Container.prototype.getAllNamedAsync = function (serviceIdentifier, named) {
            return this.getAllTaggedAsync(serviceIdentifier, NAMED_TAG, named);
        };
        Container.prototype.resolve = function (constructorFunction) {
            var isBound = this.isBound(constructorFunction);
            if (!isBound) {
                this.bind(constructorFunction).toSelf();
            }
            var resolved = this.get(constructorFunction);
            if (!isBound) {
                this.unbind(constructorFunction);
            }
            return resolved;
        };
        Container.prototype._preDestroy = function (constructor, instance) {
            if (Reflect.hasMetadata(PRE_DESTROY, constructor)) {
                var data = Reflect.getMetadata(PRE_DESTROY, constructor);
                return instance[data.value]();
            }
        };
        Container.prototype._removeModuleHandlers = function (moduleId) {
            var moduleActivationsHandlers = this._moduleActivationStore.remove(moduleId);
            this._activations.removeIntersection(moduleActivationsHandlers.onActivations);
            this._deactivations.removeIntersection(moduleActivationsHandlers.onDeactivations);
        };
        Container.prototype._removeModuleBindings = function (moduleId) {
            return this._bindingDictionary.removeByCondition(function (binding) { return binding.moduleId === moduleId; });
        };
        Container.prototype._deactivate = function (binding, instance) {
            var _this = this;
            var constructor = Object.getPrototypeOf(instance).constructor;
            try {
                if (this._deactivations.hasKey(binding.serviceIdentifier)) {
                    var result = this._deactivateContainer(instance, this._deactivations.get(binding.serviceIdentifier).values());
                    if (isPromise(result)) {
                        return this._handleDeactivationError(result.then(function () { return _this._propagateContainerDeactivationThenBindingAndPreDestroyAsync(binding, instance, constructor); }), constructor);
                    }
                }
                var propagateDeactivationResult = this._propagateContainerDeactivationThenBindingAndPreDestroy(binding, instance, constructor);
                if (isPromise(propagateDeactivationResult)) {
                    return this._handleDeactivationError(propagateDeactivationResult, constructor);
                }
            }
            catch (ex) {
                throw new Error(ON_DEACTIVATION_ERROR(constructor.name, ex.message));
            }
        };
        Container.prototype._handleDeactivationError = function (asyncResult, constructor) {
            return __awaiter(this, void 0, void 0, function () {
                var ex_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, asyncResult];
                        case 1:
                            _a.sent();
                            return [3, 3];
                        case 2:
                            ex_1 = _a.sent();
                            throw new Error(ON_DEACTIVATION_ERROR(constructor.name, ex_1.message));
                        case 3: return [2];
                    }
                });
            });
        };
        Container.prototype._deactivateContainer = function (instance, deactivationsIterator) {
            var _this = this;
            var deactivation = deactivationsIterator.next();
            while (deactivation.value) {
                var result = deactivation.value(instance);
                if (isPromise(result)) {
                    return result.then(function () {
                        return _this._deactivateContainerAsync(instance, deactivationsIterator);
                    });
                }
                deactivation = deactivationsIterator.next();
            }
        };
        Container.prototype._deactivateContainerAsync = function (instance, deactivationsIterator) {
            return __awaiter(this, void 0, void 0, function () {
                var deactivation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            deactivation = deactivationsIterator.next();
                            _a.label = 1;
                        case 1:
                            if (!deactivation.value) return [3, 3];
                            return [4, deactivation.value(instance)];
                        case 2:
                            _a.sent();
                            deactivation = deactivationsIterator.next();
                            return [3, 1];
                        case 3: return [2];
                    }
                });
            });
        };
        Container.prototype._getContainerModuleHelpersFactory = function () {
            var _this = this;
            var setModuleId = function (bindingToSyntax, moduleId) {
                bindingToSyntax._binding.moduleId = moduleId;
            };
            var getBindFunction = function (moduleId) {
                return function (serviceIdentifier) {
                    var bindingToSyntax = _this.bind(serviceIdentifier);
                    setModuleId(bindingToSyntax, moduleId);
                    return bindingToSyntax;
                };
            };
            var getUnbindFunction = function () {
                return function (serviceIdentifier) {
                    return _this.unbind(serviceIdentifier);
                };
            };
            var getUnbindAsyncFunction = function () {
                return function (serviceIdentifier) {
                    return _this.unbindAsync(serviceIdentifier);
                };
            };
            var getIsboundFunction = function () {
                return function (serviceIdentifier) {
                    return _this.isBound(serviceIdentifier);
                };
            };
            var getRebindFunction = function (moduleId) {
                return function (serviceIdentifier) {
                    var bindingToSyntax = _this.rebind(serviceIdentifier);
                    setModuleId(bindingToSyntax, moduleId);
                    return bindingToSyntax;
                };
            };
            var getOnActivationFunction = function (moduleId) {
                return function (serviceIdentifier, onActivation) {
                    _this._moduleActivationStore.addActivation(moduleId, serviceIdentifier, onActivation);
                    _this.onActivation(serviceIdentifier, onActivation);
                };
            };
            var getOnDeactivationFunction = function (moduleId) {
                return function (serviceIdentifier, onDeactivation) {
                    _this._moduleActivationStore.addDeactivation(moduleId, serviceIdentifier, onDeactivation);
                    _this.onDeactivation(serviceIdentifier, onDeactivation);
                };
            };
            return function (mId) { return ({
                bindFunction: getBindFunction(mId),
                isboundFunction: getIsboundFunction(),
                onActivationFunction: getOnActivationFunction(mId),
                onDeactivationFunction: getOnDeactivationFunction(mId),
                rebindFunction: getRebindFunction(mId),
                unbindFunction: getUnbindFunction(),
                unbindAsyncFunction: getUnbindAsyncFunction()
            }); };
        };
        Container.prototype._getAll = function (getArgs) {
            return Promise.all(this._get(getArgs));
        };
        Container.prototype._get = function (getArgs) {
            var planAndResolveArgs = __assign(__assign({}, getArgs), { contextInterceptor: function (context) { return context; }, targetType: TargetTypeEnum.Variable });
            if (this._middleware) {
                var middlewareResult = this._middleware(planAndResolveArgs);
                if (middlewareResult === undefined || middlewareResult === null) {
                    throw new Error(INVALID_MIDDLEWARE_RETURN);
                }
                return middlewareResult;
            }
            return this._planAndResolve()(planAndResolveArgs);
        };
        Container.prototype._getButThrowIfAsync = function (getArgs) {
            var result = this._get(getArgs);
            if (isPromiseOrContainsPromise(result)) {
                throw new Error(LAZY_IN_SYNC(getArgs.serviceIdentifier));
            }
            return result;
        };
        Container.prototype._getAllArgs = function (serviceIdentifier) {
            var getAllArgs = {
                avoidConstraints: true,
                isMultiInject: true,
                serviceIdentifier: serviceIdentifier,
            };
            return getAllArgs;
        };
        Container.prototype._getNotAllArgs = function (serviceIdentifier, isMultiInject, key, value) {
            var getNotAllArgs = {
                avoidConstraints: false,
                isMultiInject: isMultiInject,
                serviceIdentifier: serviceIdentifier,
                key: key,
                value: value,
            };
            return getNotAllArgs;
        };
        Container.prototype._planAndResolve = function () {
            var _this = this;
            return function (args) {
                var context = plan(_this._metadataReader, _this, args.isMultiInject, args.targetType, args.serviceIdentifier, args.key, args.value, args.avoidConstraints);
                context = args.contextInterceptor(context);
                var result = resolve(context);
                return result;
            };
        };
        Container.prototype._deactivateIfSingleton = function (binding) {
            var _this = this;
            if (!binding.activated) {
                return;
            }
            if (isPromise(binding.cache)) {
                return binding.cache.then(function (resolved) { return _this._deactivate(binding, resolved); });
            }
            return this._deactivate(binding, binding.cache);
        };
        Container.prototype._deactivateSingletons = function (bindings) {
            for (var _i = 0, bindings_1 = bindings; _i < bindings_1.length; _i++) {
                var binding = bindings_1[_i];
                var result = this._deactivateIfSingleton(binding);
                if (isPromise(result)) {
                    throw new Error(ASYNC_UNBIND_REQUIRED);
                }
            }
        };
        Container.prototype._deactivateSingletonsAsync = function (bindings) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, Promise.all(bindings.map(function (b) { return _this._deactivateIfSingleton(b); }))];
                        case 1:
                            _a.sent();
                            return [2];
                    }
                });
            });
        };
        Container.prototype._propagateContainerDeactivationThenBindingAndPreDestroy = function (binding, instance, constructor) {
            if (this.parent) {
                return this._deactivate.bind(this.parent)(binding, instance);
            }
            else {
                return this._bindingDeactivationAndPreDestroy(binding, instance, constructor);
            }
        };
        Container.prototype._propagateContainerDeactivationThenBindingAndPreDestroyAsync = function (binding, instance, constructor) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.parent) return [3, 2];
                            return [4, this._deactivate.bind(this.parent)(binding, instance)];
                        case 1:
                            _a.sent();
                            return [3, 4];
                        case 2: return [4, this._bindingDeactivationAndPreDestroyAsync(binding, instance, constructor)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2];
                    }
                });
            });
        };
        Container.prototype._removeServiceFromDictionary = function (serviceIdentifier) {
            try {
                this._bindingDictionary.remove(serviceIdentifier);
            }
            catch (e) {
                throw new Error(CANNOT_UNBIND + " " + getServiceIdentifierAsString(serviceIdentifier));
            }
        };
        Container.prototype._bindingDeactivationAndPreDestroy = function (binding, instance, constructor) {
            var _this = this;
            if (typeof binding.onDeactivation === "function") {
                var result = binding.onDeactivation(instance);
                if (isPromise(result)) {
                    return result.then(function () { return _this._preDestroy(constructor, instance); });
                }
            }
            return this._preDestroy(constructor, instance);
        };
        Container.prototype._bindingDeactivationAndPreDestroyAsync = function (binding, instance, constructor) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof binding.onDeactivation === "function")) return [3, 2];
                            return [4, binding.onDeactivation(instance)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [4, this._preDestroy(constructor, instance)];
                        case 3:
                            _a.sent();
                            return [2];
                    }
                });
            });
        };
        return Container;
    }());

    function getFirstArrayDuplicate(array) {
        var seenValues = new Set();
        for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
            var entry = array_1[_i];
            if (seenValues.has(entry)) {
                return entry;
            }
            else {
                seenValues.add(entry);
            }
        }
        return undefined;
    }

    function targetIsConstructorFunction(target) {
        return target.prototype !== undefined;
    }
    function _throwIfMethodParameter(parameterName) {
        if (parameterName !== undefined) {
            throw new Error(INVALID_DECORATOR_OPERATION);
        }
    }
    function tagParameter(annotationTarget, parameterName, parameterIndex, metadata) {
        _throwIfMethodParameter(parameterName);
        _tagParameterOrProperty(TAGGED, annotationTarget, parameterIndex.toString(), metadata);
    }
    function tagProperty(annotationTarget, propertyName, metadata) {
        if (targetIsConstructorFunction(annotationTarget)) {
            throw new Error(INVALID_DECORATOR_OPERATION);
        }
        _tagParameterOrProperty(TAGGED_PROP, annotationTarget.constructor, propertyName, metadata);
    }
    function _ensureNoMetadataKeyDuplicates(metadata) {
        var metadatas = [];
        if (Array.isArray(metadata)) {
            metadatas = metadata;
            var duplicate = getFirstArrayDuplicate(metadatas.map(function (md) { return md.key; }));
            if (duplicate !== undefined) {
                throw new Error(DUPLICATED_METADATA + " " + duplicate.toString());
            }
        }
        else {
            metadatas = [metadata];
        }
        return metadatas;
    }
    function _tagParameterOrProperty(metadataKey, annotationTarget, key, metadata) {
        var metadatas = _ensureNoMetadataKeyDuplicates(metadata);
        var paramsOrPropertiesMetadata = {};
        if (Reflect.hasOwnMetadata(metadataKey, annotationTarget)) {
            paramsOrPropertiesMetadata = Reflect.getMetadata(metadataKey, annotationTarget);
        }
        var paramOrPropertyMetadata = paramsOrPropertiesMetadata[key];
        if (paramOrPropertyMetadata === undefined) {
            paramOrPropertyMetadata = [];
        }
        else {
            var _loop_1 = function (m) {
                if (metadatas.some(function (md) { return md.key === m.key; })) {
                    throw new Error(DUPLICATED_METADATA + " " + m.key.toString());
                }
            };
            for (var _i = 0, paramOrPropertyMetadata_1 = paramOrPropertyMetadata; _i < paramOrPropertyMetadata_1.length; _i++) {
                var m = paramOrPropertyMetadata_1[_i];
                _loop_1(m);
            }
        }
        paramOrPropertyMetadata.push.apply(paramOrPropertyMetadata, metadatas);
        paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
        Reflect.defineMetadata(metadataKey, paramsOrPropertiesMetadata, annotationTarget);
    }
    function createTaggedDecorator(metadata) {
        return function (target, targetKey, indexOrPropertyDescriptor) {
            if (typeof indexOrPropertyDescriptor === "number") {
                tagParameter(target, targetKey, indexOrPropertyDescriptor, metadata);
            }
            else {
                tagProperty(target, targetKey, metadata);
            }
        };
    }

    function injectable() {
        return function (target) {
            if (Reflect.hasOwnMetadata(PARAM_TYPES, target)) {
                throw new Error(DUPLICATED_INJECTABLE_DECORATOR);
            }
            var types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
            Reflect.defineMetadata(PARAM_TYPES, types, target);
            return target;
        };
    }

    function injectBase(metadataKey) {
        return function (serviceIdentifier) {
            return function (target, targetKey, indexOrPropertyDescriptor) {
                if (serviceIdentifier === undefined) {
                    var className = typeof target === "function" ? target.name : target.constructor.name;
                    throw new Error(UNDEFINED_INJECT_ANNOTATION(className));
                }
                return createTaggedDecorator(new Metadata(metadataKey, serviceIdentifier))(target, targetKey, indexOrPropertyDescriptor);
            };
        };
    }

    var inject = injectBase(INJECT_TAG);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /*! *****************************************************************************
    Copyright (C) Microsoft. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var Reflect$1;
    (function (Reflect) {
        // Metadata Proposal
        // https://rbuckton.github.io/reflect-metadata/
        (function (factory) {
            var root = typeof commonjsGlobal === "object" ? commonjsGlobal :
                typeof self === "object" ? self :
                    typeof this === "object" ? this :
                        Function("return this;")();
            var exporter = makeExporter(Reflect);
            if (typeof root.Reflect === "undefined") {
                root.Reflect = Reflect;
            }
            else {
                exporter = makeExporter(root.Reflect, exporter);
            }
            factory(exporter);
            function makeExporter(target, previous) {
                return function (key, value) {
                    if (typeof target[key] !== "function") {
                        Object.defineProperty(target, key, { configurable: true, writable: true, value: value });
                    }
                    if (previous)
                        previous(key, value);
                };
            }
        })(function (exporter) {
            var hasOwn = Object.prototype.hasOwnProperty;
            // feature test for Symbol support
            var supportsSymbol = typeof Symbol === "function";
            var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
            var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
            var supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
            var supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
            var downLevel = !supportsCreate && !supportsProto;
            var HashMap = {
                // create an object in dictionary mode (a.k.a. "slow" mode in v8)
                create: supportsCreate
                    ? function () { return MakeDictionary(Object.create(null)); }
                    : supportsProto
                        ? function () { return MakeDictionary({ __proto__: null }); }
                        : function () { return MakeDictionary({}); },
                has: downLevel
                    ? function (map, key) { return hasOwn.call(map, key); }
                    : function (map, key) { return key in map; },
                get: downLevel
                    ? function (map, key) { return hasOwn.call(map, key) ? map[key] : undefined; }
                    : function (map, key) { return map[key]; },
            };
            // Load global or shim versions of Map, Set, and WeakMap
            var functionPrototype = Object.getPrototypeOf(Function);
            var usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
            var _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
            var _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
            var _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
            // [[Metadata]] internal slot
            // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
            var Metadata = new _WeakMap();
            /**
             * Applies a set of decorators to a property of a target object.
             * @param decorators An array of decorators.
             * @param target The target object.
             * @param propertyKey (Optional) The property key to decorate.
             * @param attributes (Optional) The property descriptor for the target key.
             * @remarks Decorators are applied in reverse order.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     Example = Reflect.decorate(decoratorsArray, Example);
             *
             *     // property (on constructor)
             *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
             *
             *     // property (on prototype)
             *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
             *
             *     // method (on constructor)
             *     Object.defineProperty(Example, "staticMethod",
             *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
             *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
             *
             *     // method (on prototype)
             *     Object.defineProperty(Example.prototype, "method",
             *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
             *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
             *
             */
            function decorate(decorators, target, propertyKey, attributes) {
                if (!IsUndefined(propertyKey)) {
                    if (!IsArray(decorators))
                        throw new TypeError();
                    if (!IsObject(target))
                        throw new TypeError();
                    if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                        throw new TypeError();
                    if (IsNull(attributes))
                        attributes = undefined;
                    propertyKey = ToPropertyKey(propertyKey);
                    return DecorateProperty(decorators, target, propertyKey, attributes);
                }
                else {
                    if (!IsArray(decorators))
                        throw new TypeError();
                    if (!IsConstructor(target))
                        throw new TypeError();
                    return DecorateConstructor(decorators, target);
                }
            }
            exporter("decorate", decorate);
            // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
            // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
            /**
             * A default metadata decorator factory that can be used on a class, class member, or parameter.
             * @param metadataKey The key for the metadata entry.
             * @param metadataValue The value for the metadata entry.
             * @returns A decorator function.
             * @remarks
             * If `metadataKey` is already defined for the target and target key, the
             * metadataValue for that key will be overwritten.
             * @example
             *
             *     // constructor
             *     @Reflect.metadata(key, value)
             *     class Example {
             *     }
             *
             *     // property (on constructor, TypeScript only)
             *     class Example {
             *         @Reflect.metadata(key, value)
             *         static staticProperty;
             *     }
             *
             *     // property (on prototype, TypeScript only)
             *     class Example {
             *         @Reflect.metadata(key, value)
             *         property;
             *     }
             *
             *     // method (on constructor)
             *     class Example {
             *         @Reflect.metadata(key, value)
             *         static staticMethod() { }
             *     }
             *
             *     // method (on prototype)
             *     class Example {
             *         @Reflect.metadata(key, value)
             *         method() { }
             *     }
             *
             */
            function metadata(metadataKey, metadataValue) {
                function decorator(target, propertyKey) {
                    if (!IsObject(target))
                        throw new TypeError();
                    if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                        throw new TypeError();
                    OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
                }
                return decorator;
            }
            exporter("metadata", metadata);
            /**
             * Define a unique metadata entry on the target.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param metadataValue A value that contains attached metadata.
             * @param target The target object on which to define metadata.
             * @param propertyKey (Optional) The property key for the target.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     Reflect.defineMetadata("custom:annotation", options, Example);
             *
             *     // property (on constructor)
             *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
             *
             *     // property (on prototype)
             *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
             *
             *     // method (on constructor)
             *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
             *
             *     // method (on prototype)
             *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
             *
             *     // decorator factory as metadata-producing annotation.
             *     function MyAnnotation(options): Decorator {
             *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
             *     }
             *
             */
            function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
            }
            exporter("defineMetadata", defineMetadata);
            /**
             * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.hasMetadata("custom:annotation", Example);
             *
             *     // property (on constructor)
             *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
             *
             */
            function hasMetadata(metadataKey, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryHasMetadata(metadataKey, target, propertyKey);
            }
            exporter("hasMetadata", hasMetadata);
            /**
             * Gets a value indicating whether the target object has the provided metadata key defined.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
             *
             *     // property (on constructor)
             *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
             *
             */
            function hasOwnMetadata(metadataKey, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
            }
            exporter("hasOwnMetadata", hasOwnMetadata);
            /**
             * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.getMetadata("custom:annotation", Example);
             *
             *     // property (on constructor)
             *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
             *
             */
            function getMetadata(metadataKey, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryGetMetadata(metadataKey, target, propertyKey);
            }
            exporter("getMetadata", getMetadata);
            /**
             * Gets the metadata value for the provided metadata key on the target object.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.getOwnMetadata("custom:annotation", Example);
             *
             *     // property (on constructor)
             *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
             *
             */
            function getOwnMetadata(metadataKey, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
            }
            exporter("getOwnMetadata", getOwnMetadata);
            /**
             * Gets the metadata keys defined on the target object or its prototype chain.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns An array of unique metadata keys.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.getMetadataKeys(Example);
             *
             *     // property (on constructor)
             *     result = Reflect.getMetadataKeys(Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.getMetadataKeys(Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.getMetadataKeys(Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.getMetadataKeys(Example.prototype, "method");
             *
             */
            function getMetadataKeys(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryMetadataKeys(target, propertyKey);
            }
            exporter("getMetadataKeys", getMetadataKeys);
            /**
             * Gets the unique metadata keys defined on the target object.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns An array of unique metadata keys.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.getOwnMetadataKeys(Example);
             *
             *     // property (on constructor)
             *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
             *
             */
            function getOwnMetadataKeys(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                return OrdinaryOwnMetadataKeys(target, propertyKey);
            }
            exporter("getOwnMetadataKeys", getOwnMetadataKeys);
            /**
             * Deletes the metadata entry from the target object with the provided key.
             * @param metadataKey A key used to store and retrieve metadata.
             * @param target The target object on which the metadata is defined.
             * @param propertyKey (Optional) The property key for the target.
             * @returns `true` if the metadata entry was found and deleted; otherwise, false.
             * @example
             *
             *     class Example {
             *         // property declarations are not part of ES6, though they are valid in TypeScript:
             *         // static staticProperty;
             *         // property;
             *
             *         constructor(p) { }
             *         static staticMethod(p) { }
             *         method(p) { }
             *     }
             *
             *     // constructor
             *     result = Reflect.deleteMetadata("custom:annotation", Example);
             *
             *     // property (on constructor)
             *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
             *
             *     // property (on prototype)
             *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
             *
             *     // method (on constructor)
             *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
             *
             *     // method (on prototype)
             *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
             *
             */
            function deleteMetadata(metadataKey, target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey))
                    propertyKey = ToPropertyKey(propertyKey);
                var metadataMap = GetOrCreateMetadataMap(target, propertyKey, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                if (!metadataMap.delete(metadataKey))
                    return false;
                if (metadataMap.size > 0)
                    return true;
                var targetMetadata = Metadata.get(target);
                targetMetadata.delete(propertyKey);
                if (targetMetadata.size > 0)
                    return true;
                Metadata.delete(target);
                return true;
            }
            exporter("deleteMetadata", deleteMetadata);
            function DecorateConstructor(decorators, target) {
                for (var i = decorators.length - 1; i >= 0; --i) {
                    var decorator = decorators[i];
                    var decorated = decorator(target);
                    if (!IsUndefined(decorated) && !IsNull(decorated)) {
                        if (!IsConstructor(decorated))
                            throw new TypeError();
                        target = decorated;
                    }
                }
                return target;
            }
            function DecorateProperty(decorators, target, propertyKey, descriptor) {
                for (var i = decorators.length - 1; i >= 0; --i) {
                    var decorator = decorators[i];
                    var decorated = decorator(target, propertyKey, descriptor);
                    if (!IsUndefined(decorated) && !IsNull(decorated)) {
                        if (!IsObject(decorated))
                            throw new TypeError();
                        descriptor = decorated;
                    }
                }
                return descriptor;
            }
            function GetOrCreateMetadataMap(O, P, Create) {
                var targetMetadata = Metadata.get(O);
                if (IsUndefined(targetMetadata)) {
                    if (!Create)
                        return undefined;
                    targetMetadata = new _Map();
                    Metadata.set(O, targetMetadata);
                }
                var metadataMap = targetMetadata.get(P);
                if (IsUndefined(metadataMap)) {
                    if (!Create)
                        return undefined;
                    metadataMap = new _Map();
                    targetMetadata.set(P, metadataMap);
                }
                return metadataMap;
            }
            // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
            function OrdinaryHasMetadata(MetadataKey, O, P) {
                var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
                if (hasOwn)
                    return true;
                var parent = OrdinaryGetPrototypeOf(O);
                if (!IsNull(parent))
                    return OrdinaryHasMetadata(MetadataKey, parent, P);
                return false;
            }
            // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
            function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                return ToBoolean(metadataMap.has(MetadataKey));
            }
            // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
            function OrdinaryGetMetadata(MetadataKey, O, P) {
                var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
                if (hasOwn)
                    return OrdinaryGetOwnMetadata(MetadataKey, O, P);
                var parent = OrdinaryGetPrototypeOf(O);
                if (!IsNull(parent))
                    return OrdinaryGetMetadata(MetadataKey, parent, P);
                return undefined;
            }
            // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
            function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return undefined;
                return metadataMap.get(MetadataKey);
            }
            // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
            function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
                metadataMap.set(MetadataKey, MetadataValue);
            }
            // 3.1.6.1 OrdinaryMetadataKeys(O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
            function OrdinaryMetadataKeys(O, P) {
                var ownKeys = OrdinaryOwnMetadataKeys(O, P);
                var parent = OrdinaryGetPrototypeOf(O);
                if (parent === null)
                    return ownKeys;
                var parentKeys = OrdinaryMetadataKeys(parent, P);
                if (parentKeys.length <= 0)
                    return ownKeys;
                if (ownKeys.length <= 0)
                    return parentKeys;
                var set = new _Set();
                var keys = [];
                for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
                    var key = ownKeys_1[_i];
                    var hasKey = set.has(key);
                    if (!hasKey) {
                        set.add(key);
                        keys.push(key);
                    }
                }
                for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
                    var key = parentKeys_1[_a];
                    var hasKey = set.has(key);
                    if (!hasKey) {
                        set.add(key);
                        keys.push(key);
                    }
                }
                return keys;
            }
            // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
            function OrdinaryOwnMetadataKeys(O, P) {
                var keys = [];
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return keys;
                var keysObj = metadataMap.keys();
                var iterator = GetIterator(keysObj);
                var k = 0;
                while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                        keys.length = k;
                        return keys;
                    }
                    var nextValue = IteratorValue(next);
                    try {
                        keys[k] = nextValue;
                    }
                    catch (e) {
                        try {
                            IteratorClose(iterator);
                        }
                        finally {
                            throw e;
                        }
                    }
                    k++;
                }
            }
            // 6 ECMAScript Data Typ0es and Values
            // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
            function Type(x) {
                if (x === null)
                    return 1 /* Null */;
                switch (typeof x) {
                    case "undefined": return 0 /* Undefined */;
                    case "boolean": return 2 /* Boolean */;
                    case "string": return 3 /* String */;
                    case "symbol": return 4 /* Symbol */;
                    case "number": return 5 /* Number */;
                    case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
                    default: return 6 /* Object */;
                }
            }
            // 6.1.1 The Undefined Type
            // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
            function IsUndefined(x) {
                return x === undefined;
            }
            // 6.1.2 The Null Type
            // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
            function IsNull(x) {
                return x === null;
            }
            // 6.1.5 The Symbol Type
            // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
            function IsSymbol(x) {
                return typeof x === "symbol";
            }
            // 6.1.7 The Object Type
            // https://tc39.github.io/ecma262/#sec-object-type
            function IsObject(x) {
                return typeof x === "object" ? x !== null : typeof x === "function";
            }
            // 7.1 Type Conversion
            // https://tc39.github.io/ecma262/#sec-type-conversion
            // 7.1.1 ToPrimitive(input [, PreferredType])
            // https://tc39.github.io/ecma262/#sec-toprimitive
            function ToPrimitive(input, PreferredType) {
                switch (Type(input)) {
                    case 0 /* Undefined */: return input;
                    case 1 /* Null */: return input;
                    case 2 /* Boolean */: return input;
                    case 3 /* String */: return input;
                    case 4 /* Symbol */: return input;
                    case 5 /* Number */: return input;
                }
                var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
                var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
                if (exoticToPrim !== undefined) {
                    var result = exoticToPrim.call(input, hint);
                    if (IsObject(result))
                        throw new TypeError();
                    return result;
                }
                return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
            }
            // 7.1.1.1 OrdinaryToPrimitive(O, hint)
            // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
            function OrdinaryToPrimitive(O, hint) {
                if (hint === "string") {
                    var toString_1 = O.toString;
                    if (IsCallable(toString_1)) {
                        var result = toString_1.call(O);
                        if (!IsObject(result))
                            return result;
                    }
                    var valueOf = O.valueOf;
                    if (IsCallable(valueOf)) {
                        var result = valueOf.call(O);
                        if (!IsObject(result))
                            return result;
                    }
                }
                else {
                    var valueOf = O.valueOf;
                    if (IsCallable(valueOf)) {
                        var result = valueOf.call(O);
                        if (!IsObject(result))
                            return result;
                    }
                    var toString_2 = O.toString;
                    if (IsCallable(toString_2)) {
                        var result = toString_2.call(O);
                        if (!IsObject(result))
                            return result;
                    }
                }
                throw new TypeError();
            }
            // 7.1.2 ToBoolean(argument)
            // https://tc39.github.io/ecma262/2016/#sec-toboolean
            function ToBoolean(argument) {
                return !!argument;
            }
            // 7.1.12 ToString(argument)
            // https://tc39.github.io/ecma262/#sec-tostring
            function ToString(argument) {
                return "" + argument;
            }
            // 7.1.14 ToPropertyKey(argument)
            // https://tc39.github.io/ecma262/#sec-topropertykey
            function ToPropertyKey(argument) {
                var key = ToPrimitive(argument, 3 /* String */);
                if (IsSymbol(key))
                    return key;
                return ToString(key);
            }
            // 7.2 Testing and Comparison Operations
            // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
            // 7.2.2 IsArray(argument)
            // https://tc39.github.io/ecma262/#sec-isarray
            function IsArray(argument) {
                return Array.isArray
                    ? Array.isArray(argument)
                    : argument instanceof Object
                        ? argument instanceof Array
                        : Object.prototype.toString.call(argument) === "[object Array]";
            }
            // 7.2.3 IsCallable(argument)
            // https://tc39.github.io/ecma262/#sec-iscallable
            function IsCallable(argument) {
                // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
                return typeof argument === "function";
            }
            // 7.2.4 IsConstructor(argument)
            // https://tc39.github.io/ecma262/#sec-isconstructor
            function IsConstructor(argument) {
                // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
                return typeof argument === "function";
            }
            // 7.2.7 IsPropertyKey(argument)
            // https://tc39.github.io/ecma262/#sec-ispropertykey
            function IsPropertyKey(argument) {
                switch (Type(argument)) {
                    case 3 /* String */: return true;
                    case 4 /* Symbol */: return true;
                    default: return false;
                }
            }
            // 7.3 Operations on Objects
            // https://tc39.github.io/ecma262/#sec-operations-on-objects
            // 7.3.9 GetMethod(V, P)
            // https://tc39.github.io/ecma262/#sec-getmethod
            function GetMethod(V, P) {
                var func = V[P];
                if (func === undefined || func === null)
                    return undefined;
                if (!IsCallable(func))
                    throw new TypeError();
                return func;
            }
            // 7.4 Operations on Iterator Objects
            // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
            function GetIterator(obj) {
                var method = GetMethod(obj, iteratorSymbol);
                if (!IsCallable(method))
                    throw new TypeError(); // from Call
                var iterator = method.call(obj);
                if (!IsObject(iterator))
                    throw new TypeError();
                return iterator;
            }
            // 7.4.4 IteratorValue(iterResult)
            // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
            function IteratorValue(iterResult) {
                return iterResult.value;
            }
            // 7.4.5 IteratorStep(iterator)
            // https://tc39.github.io/ecma262/#sec-iteratorstep
            function IteratorStep(iterator) {
                var result = iterator.next();
                return result.done ? false : result;
            }
            // 7.4.6 IteratorClose(iterator, completion)
            // https://tc39.github.io/ecma262/#sec-iteratorclose
            function IteratorClose(iterator) {
                var f = iterator["return"];
                if (f)
                    f.call(iterator);
            }
            // 9.1 Ordinary Object Internal Methods and Internal Slots
            // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
            // 9.1.1.1 OrdinaryGetPrototypeOf(O)
            // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
            function OrdinaryGetPrototypeOf(O) {
                var proto = Object.getPrototypeOf(O);
                if (typeof O !== "function" || O === functionPrototype)
                    return proto;
                // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
                // Try to determine the superclass constructor. Compatible implementations
                // must either set __proto__ on a subclass constructor to the superclass constructor,
                // or ensure each class has a valid `constructor` property on its prototype that
                // points back to the constructor.
                // If this is not the same as Function.[[Prototype]], then this is definately inherited.
                // This is the case when in ES6 or when using __proto__ in a compatible browser.
                if (proto !== functionPrototype)
                    return proto;
                // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
                var prototype = O.prototype;
                var prototypeProto = prototype && Object.getPrototypeOf(prototype);
                if (prototypeProto == null || prototypeProto === Object.prototype)
                    return proto;
                // If the constructor was not a function, then we cannot determine the heritage.
                var constructor = prototypeProto.constructor;
                if (typeof constructor !== "function")
                    return proto;
                // If we have some kind of self-reference, then we cannot determine the heritage.
                if (constructor === O)
                    return proto;
                // we have a pretty good guess at the heritage.
                return constructor;
            }
            // naive Map shim
            function CreateMapPolyfill() {
                var cacheSentinel = {};
                var arraySentinel = [];
                var MapIterator = /** @class */ (function () {
                    function MapIterator(keys, values, selector) {
                        this._index = 0;
                        this._keys = keys;
                        this._values = values;
                        this._selector = selector;
                    }
                    MapIterator.prototype["@@iterator"] = function () { return this; };
                    MapIterator.prototype[iteratorSymbol] = function () { return this; };
                    MapIterator.prototype.next = function () {
                        var index = this._index;
                        if (index >= 0 && index < this._keys.length) {
                            var result = this._selector(this._keys[index], this._values[index]);
                            if (index + 1 >= this._keys.length) {
                                this._index = -1;
                                this._keys = arraySentinel;
                                this._values = arraySentinel;
                            }
                            else {
                                this._index++;
                            }
                            return { value: result, done: false };
                        }
                        return { value: undefined, done: true };
                    };
                    MapIterator.prototype.throw = function (error) {
                        if (this._index >= 0) {
                            this._index = -1;
                            this._keys = arraySentinel;
                            this._values = arraySentinel;
                        }
                        throw error;
                    };
                    MapIterator.prototype.return = function (value) {
                        if (this._index >= 0) {
                            this._index = -1;
                            this._keys = arraySentinel;
                            this._values = arraySentinel;
                        }
                        return { value: value, done: true };
                    };
                    return MapIterator;
                }());
                return /** @class */ (function () {
                    function Map() {
                        this._keys = [];
                        this._values = [];
                        this._cacheKey = cacheSentinel;
                        this._cacheIndex = -2;
                    }
                    Object.defineProperty(Map.prototype, "size", {
                        get: function () { return this._keys.length; },
                        enumerable: true,
                        configurable: true
                    });
                    Map.prototype.has = function (key) { return this._find(key, /*insert*/ false) >= 0; };
                    Map.prototype.get = function (key) {
                        var index = this._find(key, /*insert*/ false);
                        return index >= 0 ? this._values[index] : undefined;
                    };
                    Map.prototype.set = function (key, value) {
                        var index = this._find(key, /*insert*/ true);
                        this._values[index] = value;
                        return this;
                    };
                    Map.prototype.delete = function (key) {
                        var index = this._find(key, /*insert*/ false);
                        if (index >= 0) {
                            var size = this._keys.length;
                            for (var i = index + 1; i < size; i++) {
                                this._keys[i - 1] = this._keys[i];
                                this._values[i - 1] = this._values[i];
                            }
                            this._keys.length--;
                            this._values.length--;
                            if (key === this._cacheKey) {
                                this._cacheKey = cacheSentinel;
                                this._cacheIndex = -2;
                            }
                            return true;
                        }
                        return false;
                    };
                    Map.prototype.clear = function () {
                        this._keys.length = 0;
                        this._values.length = 0;
                        this._cacheKey = cacheSentinel;
                        this._cacheIndex = -2;
                    };
                    Map.prototype.keys = function () { return new MapIterator(this._keys, this._values, getKey); };
                    Map.prototype.values = function () { return new MapIterator(this._keys, this._values, getValue); };
                    Map.prototype.entries = function () { return new MapIterator(this._keys, this._values, getEntry); };
                    Map.prototype["@@iterator"] = function () { return this.entries(); };
                    Map.prototype[iteratorSymbol] = function () { return this.entries(); };
                    Map.prototype._find = function (key, insert) {
                        if (this._cacheKey !== key) {
                            this._cacheIndex = this._keys.indexOf(this._cacheKey = key);
                        }
                        if (this._cacheIndex < 0 && insert) {
                            this._cacheIndex = this._keys.length;
                            this._keys.push(key);
                            this._values.push(undefined);
                        }
                        return this._cacheIndex;
                    };
                    return Map;
                }());
                function getKey(key, _) {
                    return key;
                }
                function getValue(_, value) {
                    return value;
                }
                function getEntry(key, value) {
                    return [key, value];
                }
            }
            // naive Set shim
            function CreateSetPolyfill() {
                return /** @class */ (function () {
                    function Set() {
                        this._map = new _Map();
                    }
                    Object.defineProperty(Set.prototype, "size", {
                        get: function () { return this._map.size; },
                        enumerable: true,
                        configurable: true
                    });
                    Set.prototype.has = function (value) { return this._map.has(value); };
                    Set.prototype.add = function (value) { return this._map.set(value, value), this; };
                    Set.prototype.delete = function (value) { return this._map.delete(value); };
                    Set.prototype.clear = function () { this._map.clear(); };
                    Set.prototype.keys = function () { return this._map.keys(); };
                    Set.prototype.values = function () { return this._map.values(); };
                    Set.prototype.entries = function () { return this._map.entries(); };
                    Set.prototype["@@iterator"] = function () { return this.keys(); };
                    Set.prototype[iteratorSymbol] = function () { return this.keys(); };
                    return Set;
                }());
            }
            // naive WeakMap shim
            function CreateWeakMapPolyfill() {
                var UUID_SIZE = 16;
                var keys = HashMap.create();
                var rootKey = CreateUniqueKey();
                return /** @class */ (function () {
                    function WeakMap() {
                        this._key = CreateUniqueKey();
                    }
                    WeakMap.prototype.has = function (target) {
                        var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                        return table !== undefined ? HashMap.has(table, this._key) : false;
                    };
                    WeakMap.prototype.get = function (target) {
                        var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                        return table !== undefined ? HashMap.get(table, this._key) : undefined;
                    };
                    WeakMap.prototype.set = function (target, value) {
                        var table = GetOrCreateWeakMapTable(target, /*create*/ true);
                        table[this._key] = value;
                        return this;
                    };
                    WeakMap.prototype.delete = function (target) {
                        var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                        return table !== undefined ? delete table[this._key] : false;
                    };
                    WeakMap.prototype.clear = function () {
                        // NOTE: not a real clear, just makes the previous data unreachable
                        this._key = CreateUniqueKey();
                    };
                    return WeakMap;
                }());
                function CreateUniqueKey() {
                    var key;
                    do
                        key = "@@WeakMap@@" + CreateUUID();
                    while (HashMap.has(keys, key));
                    keys[key] = true;
                    return key;
                }
                function GetOrCreateWeakMapTable(target, create) {
                    if (!hasOwn.call(target, rootKey)) {
                        if (!create)
                            return undefined;
                        Object.defineProperty(target, rootKey, { value: HashMap.create() });
                    }
                    return target[rootKey];
                }
                function FillRandomBytes(buffer, size) {
                    for (var i = 0; i < size; ++i)
                        buffer[i] = Math.random() * 0xff | 0;
                    return buffer;
                }
                function GenRandomBytes(size) {
                    if (typeof Uint8Array === "function") {
                        if (typeof crypto !== "undefined")
                            return crypto.getRandomValues(new Uint8Array(size));
                        if (typeof msCrypto !== "undefined")
                            return msCrypto.getRandomValues(new Uint8Array(size));
                        return FillRandomBytes(new Uint8Array(size), size);
                    }
                    return FillRandomBytes(new Array(size), size);
                }
                function CreateUUID() {
                    var data = GenRandomBytes(UUID_SIZE);
                    // mark as random - RFC 4122 § 4.4
                    data[6] = data[6] & 0x4f | 0x40;
                    data[8] = data[8] & 0xbf | 0x80;
                    var result = "";
                    for (var offset = 0; offset < UUID_SIZE; ++offset) {
                        var byte = data[offset];
                        if (offset === 4 || offset === 6 || offset === 8)
                            result += "-";
                        if (byte < 16)
                            result += "0";
                        result += byte.toString(16).toLowerCase();
                    }
                    return result;
                }
            }
            // uses a heuristic used by v8 and chakra to force an object into dictionary mode.
            function MakeDictionary(obj) {
                obj.__ = undefined;
                delete obj.__;
                return obj;
            }
        });
    })(Reflect$1 || (Reflect$1 = {}));

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    }

    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    let LocalDreamRepositoryImpl = class LocalDreamRepositoryImpl {
        constructor() {
            this._dreams = [];
        }
        registerMessage(dream) {
            this._dreams.push(dream);
        }
        getCurrentMessages(limit) {
            return this._dreams.slice(-limit);
        }
    };
    LocalDreamRepositoryImpl = __decorate([
        injectable()
    ], LocalDreamRepositoryImpl);
    let DREAM_REPOSITORY_TYPES = {
        DreamRepository: Symbol('DreamRepository')
    };

    let DreamServiceImpl = class DreamServiceImpl {
        constructor(_repository) {
            this._repository = _repository;
        }
        postDream(dream) {
            this._repository.registerMessage(dream);
        }
        getCurrentDreams(limit) {
            return this._repository.getCurrentMessages(limit);
        }
    };
    DreamServiceImpl = __decorate([
        injectable(),
        __param(0, inject(DREAM_REPOSITORY_TYPES.DreamRepository)),
        __metadata("design:paramtypes", [Object])
    ], DreamServiceImpl);
    let DREAM_SERVICE_TYPES = {
        DreamService: Symbol('DreamService')
    };

    const container = new Container();
    container.bind(DREAM_REPOSITORY_TYPES.DreamRepository).to(LocalDreamRepositoryImpl).inSingletonScope();
    container.bind(DREAM_SERVICE_TYPES.DreamService).to(DreamServiceImpl).inSingletonScope();

    /* src\ui\component\Dream.svelte generated by Svelte v3.48.0 */
    const file$4 = "src\\ui\\component\\Dream.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let t0_value = /*dream*/ ctx[0].message + "";
    	let t0;
    	let t1;
    	let b;
    	let t2_value = /*dream*/ ctx[0].user.name.value + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" by\r\n    ");
    			b = element("b");
    			t2 = text(t2_value);
    			add_location(b, file$4, 6, 4, 127);
    			add_location(div, file$4, 4, 0, 92);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, b);
    			append_dev(b, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dream*/ 1 && t0_value !== (t0_value = /*dream*/ ctx[0].message + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*dream*/ 1 && t2_value !== (t2_value = /*dream*/ ctx[0].user.name.value + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dream', slots, []);
    	let { dream } = $$props;
    	const writable_props = ['dream'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dream> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('dream' in $$props) $$invalidate(0, dream = $$props.dream);
    	};

    	$$self.$capture_state = () => ({ dream });

    	$$self.$inject_state = $$props => {
    		if ('dream' in $$props) $$invalidate(0, dream = $$props.dream);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [dream];
    }

    class Dream extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { dream: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dream",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*dream*/ ctx[0] === undefined && !('dream' in props)) {
    			console.warn("<Dream> was created without expected prop 'dream'");
    		}
    	}

    	get dream() {
    		throw new Error("<Dream>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dream(value) {
    		throw new Error("<Dream>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\ui\component\Dreams.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\ui\\component\\Dreams.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (19:0) {#each dreams as dream, index}
    function create_each_block(ctx) {
    	let splashdream;
    	let current;

    	splashdream = new Dream({
    			props: { dream: /*dream*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(splashdream.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(splashdream, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const splashdream_changes = {};
    			if (dirty & /*dreams*/ 1) splashdream_changes.dream = /*dream*/ ctx[3];
    			splashdream.$set(splashdream_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(splashdream.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(splashdream.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(splashdream, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(19:0) {#each dreams as dream, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let h3;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = /*dreams*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Current Dreams!";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h3, "class", "svelte-1myqvbu");
    			add_location(h3, file$3, 17, 0, 512);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dreams*/ 1) {
    				each_value = /*dreams*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dreams', slots, []);
    	let dreams = [];

    	function showDream() {
    		$$invalidate(0, dreams = container.get(DREAM_SERVICE_TYPES.DreamService).getCurrentDreams(10));
    	} // console.log(dreams)

    	let clear;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dreams> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		container,
    		DREAM_SERVICE_TYPES,
    		SplashDream: Dream,
    		dreams,
    		showDream,
    		clear
    	});

    	$$self.$inject_state = $$props => {
    		if ('dreams' in $$props) $$invalidate(0, dreams = $$props.dreams);
    		if ('clear' in $$props) $$invalidate(1, clear = $$props.clear);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*clear*/ 2) {
    			{
    				clearInterval(clear);
    				$$invalidate(1, clear = setInterval(showDream, 1000));
    			}
    		}
    	};

    	return [dreams, clear];
    }

    class Dreams extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dreams",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    class StringId {
        constructor(value) {
            this.value = value;
        }
        static of(value) {
            return new StringId(value);
        }
    }

    class User {
        constructor(name, sex) {
            this.name = name;
            this.sex = sex;
        }
    }
    var Sex;
    (function (Sex) {
        Sex[Sex["NONE"] = 0] = "NONE";
        Sex[Sex["MALE"] = 1] = "MALE";
        Sex[Sex["FEMALE"] = 2] = "FEMALE";
    })(Sex || (Sex = {}));

    /* src\ui\component\NewDream.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file$2 = "src\\ui\\component\\NewDream.svelte";

    function create_fragment$3(ctx) {
    	let h3;
    	let t1;
    	let label0;
    	let t3;
    	let input;
    	let t4;
    	let br0;
    	let t5;
    	let label1;
    	let t7;
    	let textarea;
    	let t8;
    	let br1;
    	let t9;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Write New Dream";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "ニックネーム:";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "メッセージ:";
    			t7 = space();
    			textarea = element("textarea");
    			t8 = space();
    			br1 = element("br");
    			t9 = space();
    			button = element("button");
    			button.textContent = "夢を語る";
    			attr_dev(h3, "class", "svelte-1jdm14e");
    			add_location(h3, file$2, 19, 0, 718);
    			attr_dev(label0, "for", "new-dream-name");
    			add_location(label0, file$2, 22, 0, 752);
    			attr_dev(input, "id", "new-dream-name");
    			add_location(input, file$2, 23, 0, 798);
    			add_location(br0, file$2, 24, 0, 845);
    			attr_dev(label1, "for", "new-dream-message");
    			add_location(label1, file$2, 25, 0, 851);
    			attr_dev(textarea, "id", "new-dream-message");
    			attr_dev(textarea, "cols", "40");
    			attr_dev(textarea, "rows", "5");
    			attr_dev(textarea, "wrap", "hard");
    			add_location(textarea, file$2, 26, 0, 899);
    			add_location(br1, file$2, 27, 0, 997);
    			add_location(button, file$2, 28, 0, 1003);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*name*/ ctx[0]);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*message*/ ctx[1]);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[4]),
    					listen_dev(button, "click", /*register*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}

    			if (dirty & /*message*/ 2) {
    				set_input_value(textarea, /*message*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NewDream', slots, []);
    	let name = 'initial';
    	let message = 'message';

    	function register() {
    		if (!name || !name.trim() || !message || !message.trim()) {
    			return;
    		}

    		let dream = new Dream$1(new User(StringId.of(name), Sex.MALE), message);
    		console.log(dream);
    		container.get(DREAM_SERVICE_TYPES.DreamService).postDream(dream);
    		$$invalidate(0, name = '');
    		$$invalidate(1, message = '');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<NewDream> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function textarea_input_handler() {
    		message = this.value;
    		$$invalidate(1, message);
    	}

    	$$self.$capture_state = () => ({
    		StringId,
    		Dream: Dream$1,
    		Sex,
    		User,
    		DREAM_SERVICE_TYPES,
    		container,
    		name,
    		message,
    		register
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('message' in $$props) $$invalidate(1, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, message, register, input_input_handler, textarea_input_handler];
    }

    class NewDream extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NewDream",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\ui\component\common\Title.svelte generated by Svelte v3.48.0 */

    const file$1 = "src\\ui\\component\\common\\Title.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(h1, "class", "svelte-vqkpcx");
    			add_location(h1, file$1, 4, 4, 59);
    			add_location(main, file$1, 3, 0, 48);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data_dev(t, /*title*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Title', slots, []);
    	let { title } = $$props;
    	const writable_props = ['title'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Title> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({ title });

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title];
    }

    class Title extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Title",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !('title' in props)) {
    			console.warn("<Title> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Title>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Title>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\ui\page\Top.svelte generated by Svelte v3.48.0 */

    function create_fragment$1(ctx) {
    	let title;
    	let t0;
    	let newdream;
    	let t1;
    	let dreams;
    	let current;

    	title = new Title({
    			props: { title: "Dream Eater!" },
    			$$inline: true
    		});

    	newdream = new NewDream({ $$inline: true });
    	dreams = new Dreams({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(newdream.$$.fragment);
    			t1 = space();
    			create_component(dreams.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(title, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(newdream, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(dreams, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(newdream.$$.fragment, local);
    			transition_in(dreams.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(newdream.$$.fragment, local);
    			transition_out(dreams.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(newdream, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(dreams, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Top', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Top> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Dreams, NewDream, Title });
    	return [];
    }

    class Top extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Top",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\ui\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\ui\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let top;
    	let current;
    	top = new Top({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(top.$$.fragment);
    			attr_dev(main, "class", "svelte-mb13as");
    			add_location(main, file, 3, 0, 67);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(top, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(top.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(top.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(top);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Top });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
