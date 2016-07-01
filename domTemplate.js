/**
 * 一个非侵入式、不会破坏原来静态页面结构、可被浏览器正确显示的、格式良好的前端引擎
 * Created by Parky on 2016/5/13.
 */


;
(function ($) {

    "use strict";

    var DomTemplate = function () {
    };

    $.dt =$.domTemplate = DomTemplate;
    
    /**
     * 渲染数据上下文
     * @param options
     * @param ctx
     * @constructor
     */
    var Context = function (options, ctx) {
        var parentOptions = ctx ? ctx.options : {};
        this.id = $.dt.generateId();
        this.idIndex = 0;
        this.options = $.extend(
            {
                attrEscape: false,
                escape: true,
                data: {},
                selector: 'body',
                prefix: 'h-'

            }, parentOptions, options);
        if (ctx) {
            this.options.parentCtx = ctx;
            //deep copy
            this.options.data = $.extend({}, this.options.parentCtx.options.data);
        }
        this.options.prefixLength = this.options.prefix.length;
        this.options.$parentElement = this.options.$parentElement || $(this.options.selector);
        this.options.$currentElement = this.options.$currentElement || this.options.$parentElement;
        this.options.data.params= $.domTemplate.params();
        this.data=this.options.data;
    };

    Context.prototype = {

        attr: function ($item, attrName) {
            return $item.attr(attrName);
        },

        generateId: function () {
            return this.id + '_' + this.idIndex++;
        },

        getValue: function (path) {
            var keySet = path.split(".");
            var value = this.options.data;
            for (var i = 0; i < keySet.length; i++) {
                value = value[$.dt.trim(keySet[i])];
            }
            return value;
        },
        tpl: function (exp,escape) {
            return $.dt.template.tpl(exp, this.options.data, escape);
        },
        compile: function (exp) {
            var result= $.dt.template.compile(exp, this.options.data);
            if(isFunction(result)){
                return result(this);
            }else{
                return result;
            }
        },
        find: function (selector) {//查找子类和自身
            var $el = this.options.$parentElement;
            if ($el) {
                var $items = $el.find(selector);
                $items.push($el[0]);
                return $items;
            } else {
                return [];
            }
        },
        cleanDoneTag: function () {
            var $items = this.find('[' + _domTemplate.fn.doneTagsKey + ']');
            $items.each(function (index, item) {
                _domTemplate.fn.cleanDone($(item));
            });
        },
        currentElTagAttr: function (name, attr) {
            var $el = this.options.$currentElement;
            if ($el) {
                if (typeof name == 'string' && (1 in arguments)) {
                    switch (name) {
                        case 'val':
                            $el.val(attr);
                            break;
                        case 'text':
                            $el.text(attr);
                            break;
                        case 'class':
                            $el.toggleClass(attr);
                            break;
                        case 'css':
                            $el.css(attr);
                            break;
                        case 'html':
                            $el.html(attr);
                            break;
                        default:
                            $el.attr(name, attr);
                    }
                } else {
                    return $el.attr(this.options.prefix + name);
                }
            }
        }

    };


    function isEmptyObject(obj) {
        for (var name in obj) {
            return false;
        }
        return true;
    }

    function isFunction(obj) {
        return Object.prototype.toString.apply(obj) === "[object Function]";
    }

    function isArray(arr) {
        return Object.prototype.toString.apply(arr) === '[object Array]';
    }

    function toJson(str) {
        return (new Function("", "return " + str))();
    }

    function getURLParams() {
        var url = location.search;
        var params = {};
        if (url.indexOf("?") != -1) {
            var str = url.substr(1),pairs = str.split("&"),pair;
            for(var i = 0; i < pairs.length; i ++) {
                pair=pairs[i].split("=");
                params[pair[0]]=(pair[1]);
            }
        }
        return params;
    }
    $.dt.isFunction=isFunction;
    $.dt.isArray=isArray;
    /**
     * model 数据请求对象
     * @param ctx
     * @param model
     * @param name
     * @param options
     * @constructor
     */
    var DataLoader = function (ctx, model, name, options) {
        this.ctx = ctx || {};
        this.model = model;
        this.options = options;
        this.name = name || '';
    };

    DataLoader.prototype = {
        setValue: function (value) {
            var me = this;
            if(isFunction(me.options.render)){
                value= me.options.render(me.name, value);
            }else if (me.options.render && me.options.render in window) {
                value = window[me.options.render](me.name, value);
            }
            me.ctx.options.data[me.name] =  $.extend(value, me.model.methods);
            return value;
        },
        load: function (callback) {
            var me = this;
            callback = callback || me.callback;

            var _async = typeof callback === "function" ? true : false;
            var _resultData;
            var ajaxParams = $.extend({
                type: 'post',
                data: {},
                dataType: 'json',
                async: _async

            }, me.options);
            ajaxParams.success = function (res) {
                res = me.setValue(res);
                _async ? callback(me.model) : _resultData = res;
            };

            ajaxParams.error = function (xhr, status, orr) {
                console.error(status + ":" + orr);
                var value = me.setValue();
                _async ? callback(me.model) : _resultData = value;
            };
            if (ajaxParams.url && ajaxParams.url != '') {
                $.ajax(ajaxParams);
            } else {
                ajaxParams.error();
            }

            if (!_async) {
                return _resultData;
            }
        }
    };

    /**
     * model数据对象
     * @param options
     * @constructor
     */
    var Model = function (options) {
        this.options = $.extend({
            children: [],
            parent: {},
            sibling: {},
            parsed: false
        }, options);
    };

    Model.prototype = {
        methods:function(methods){
            this.methods=methods;
        },
        setParams: function (options) {
            $.extend(this.options.dataLoader.options, options);
            return this;
        },
        setParamsData: function (data) {
            this.options.dataLoader.options.data = data;
            return this;
        },
        childrenSize: function () {
            return this.options.children.length;
        },
        callback: function (model) {
            model.execute();
        },
        reload: function (options, callback) {
            if (this.options.ctx) {
                this.options.parsed = false;
                if (!isFunction(options)) {
                    $.extend(this.options.ctx.options, options);
                }
                this.options.ctx.cleanDoneTag();
            }
            this.options.callback = isFunction(options) ? options : callback;
            if (this.options.callback && this.options.ctx) {
                this.options.ctx.options.callback = this.options.callback;
            }
            this.load();
        },
        load: function () {
            var childrenSize = this.childrenSize();
            if (this.options.dataLoader) {
                this.options.dataLoader.callback = childrenSize == 0 ? this.callback : null;
                this.options.dataLoader.load();

                for (var i = 0; i < childrenSize; i++) {
                    this.options.children[i].load(this.callback);
                }

            } else {
                for (var i = 0; i < childrenSize; i++) {
                    this.options.children[i].load(this.callback);
                }
                if(childrenSize==0){
                    this.execute();
                }
            }
        },
        addChild: function (childModel) {
            childModel.parent = this;
            this.options.children.push(childModel);
            return this;
        },
        addSibling: function (model) {
            this.options.sibling.push(model);
            return this;
        },
        /**
         * 所有嵌套model是否解析
         * @returns {boolean}
         */
        isAllChildrenDone: function () {
            var childrenSize = this.childrenSize();
            for (var i = 0; i < childrenSize; i++) {
                if(!this.options.children[i].options.parsed){
                    return false;
                }
            }
            return true;
        },
        execute: function (ctx) {
            if (!this.options.parsed) {
                this.options.parsed = true;
                this.options.ctx = this.options.ctx ? new Context(this.options.ctx.options, this.options.parentCtx)
                    : new Context({
                    name: this.options.name,
                    $parentElement: this.options.modelEl
                }, this.options.parentCtx);
                if (isEmptyObject(this.options.ctx.options.data)) {//data数据为空
                    return;
                }
                this.options.ctx.options.$currentElement = this.options.modelEl;
                this.options.ctx.modelCtx = this.options.ctx;

                this.options.ctx.model=this;

                _domTemplate.fn.tagsExecutor(this.options.ctx);
            }
            if (this.parent&&this.parent.isAllChildrenDone()) {
                this.parent.execute(this.options.parentCtx);
            }
            if (this.options.ctx.options.callback) {
                this.options.ctx.options.callback(this)
            }

        }
    };

    $.dt.newContext = function (options) {
        return new Context(options);
    }

    var _domTemplate = {};

    _domTemplate.fn = DomTemplate.prototype = {
        version: '1.0.9',
        doneTagsKey: 'done-tags',
        idIndex: 0,
        supportAttrs: ['text', 'val', 'html', 'href', 'src', 'class', 'css', 'width', 'height', 'name', 'id', 'title', 'alt'],
        rootModel: {},
        models: {},

        init: function (options, callback) {
            if (isFunction(options)) {
                options = {callback: options};
            } else {
                options = options || {};
                options.callback = callback;
            }

            var ctx = new Context(options);
            ctx.options.data.params=$.dt.params;
            this.executeModel(ctx);
        },

        cleanDone: function ($item) {
            $item.removeAttr(this.doneTagsKey);
        },
        setDone: function ($item, tagName) {
            var tagsNames = $item.attr(this.doneTagsKey);
            tagsNames = tagsNames || '';
            tagName += '|';
            if (tagsNames.indexOf(tagName) < 0) {
                tagsNames += tagName;
                $item.attr(this.doneTagsKey, tagsNames);
                return true;
            }
            return false;
        },
        isDone: function ($item, tagName) {
            var tagsNames = $item.attr(this.doneTagsKey);
            if (tagsNames) {
                tagName += '|';
                return tagsNames.indexOf(tagName) > -1;
            }
            return false;

        },
        executeModel: function (ctx) {
            try {
                this.modelTag.execute(ctx);
            } catch (e) {
                console.error("execute modelTag error:");
                console.error(e);
            }
        },
        setRootModel: function (model) {
            this.rootModel = model;
            this.models[model.options.name] = model;
        },
        setModels: function (models) {
            for (var i = 0; i < models.length; i++) {
                this.models[models[i].options.name] = models[i];
            }
        },
        getModel: function (modelName) {
            return this.models[modelName];
        }

    };
    //生成全局ID
    $.dt.generateId = function () {
        return "dt_" + _domTemplate.fn.idIndex++;
    };
    //HTML转义
    $.dt.encodeHTML = function (source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\\/g, '&#92;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
    $.dt.trim = function (str) {
        return $.trim(str);
    }
    $.dt.params=function(){
        if(!$.dt._params){
            $.dt._params= getURLParams();
        }
        return $.dt._params;
    };
    _domTemplate.fn.modelTag = {
        name: 'model',
        tagName: function (ctx) {
            return ctx.options.prefix + this.name;
        },
        parseModelName: function (selector) {
            var ctx = new Context();
            var modelAttr = '[' + this.tagName(ctx) + ']';
            var modelNames = [];

            var $items = selector.find(modelAttr);
            $items.push(selector);
            var me = this;
            $items.each(function (index, $item) {
                var $modelItem = $($item);
                var template = $modelItem.attr(me.tagName(ctx));
                if ($.trim(template) != '') {
                    var modelParams = toJson(template);
                    for (var modelName in modelParams) {
                        modelNames.push(modelName);
                    }
                }
            });
            return modelNames;
        },
        modelParser: function (ctx, $modelItem) {

            var template = ctx.attr($modelItem, this.tagName(ctx));
            if ($.trim(template) == '') {
                return [new Model({name: 'root', modelEl: $modelItem, parentCtx: ctx})];
            }
            var modelParams = toJson(template);
            var models = [], _model, preModel;
            for (var modelName in modelParams) {
                _model = new Model({name: modelName, modelEl: $modelItem, parentCtx: ctx});
                var dataLoader = new DataLoader(ctx, _model, modelName, modelParams[modelName]);
                _model.options.dataLoader = dataLoader;
                models.push(_model);
                if (preModel) {
                    preModel.addChild(_model)
                }
                preModel = _model;
            }
            return models;
        },
        modelTreeParser: function (ctx, parentModel, $parentEl) {
            var me = this;
            var modelAttr = '[' + this.tagName(ctx) + ']';
            $parentEl.find(modelAttr).each(function (index, $item) {
                var $modelItem = $($item);
                var models = me.modelParser(ctx, $modelItem);
                var firstModel = models[0];
                parentModel.addChild(firstModel);
                var lastModel = models.length === 1 ? firstModel : models[models.length - 1];
                me.modelTreeParser(ctx, lastModel, $modelItem);
                _domTemplate.fn.setModels(models);

            });
        },
        execute: function (ctx) {
            var me = this;
            var $rootItem = ctx.options.$currentElement || $(ctx.options.selector);

            _domTemplate.fn.removeTag.execute(ctx, $rootItem);

            var rootModels = me.modelParser(ctx, $rootItem);
            var rootModel = rootModels[0];
            var lastModel = rootModels.length === 1 ? rootModel : rootModels[rootModels.length - 1];
            me.modelTreeParser(ctx, lastModel, $rootItem);
            _domTemplate.fn.setRootModel(rootModel);
            if(ctx.options.before){
              ctx.options.before();
            }
            this.render(rootModel);
            return this;
        },
        render: function (model) {
            model.load();
        }
    };

    _domTemplate.fn.removeTag = {
        name: 'remove',
        tagName: function (ctx) {
            return ctx.options.prefix + this.name;
        },
        execute: function (ctx, $rootItem) {
            var tagName = this.tagName(ctx);
            var $items = $rootItem.find('[' + tagName + ']');
            $items.each(function (index, item) {
                $(item).remove();
            });
            return this;
        }
    };

    _domTemplate.fn.eachTag = {
        name: 'each',
        lastItemIdKey: "last_id",
        itemKey: "itemKey",
        itemKeyAttr: '[itemKey]',

        tagName: function (ctx) {
            return ctx.options.prefix + this.name;
        },
        tagNameAttr: function (ctx) {
            return '[' + this.tagName(ctx) + ']';
        },
        isEachChunk: function ($el) {//含有itemKey的属性的，表示each循环的模板，each模板只在each标签逻辑中执行一次
            return $el.closest(this.itemKeyAttr).length > 0;
        },
        execute: function (ctx) {
            var me = this;
            var tagName = this.tagName(ctx);
            var $items = ctx.options.$parentElement.find('[' + tagName + ']');
            $items.each(function (index, item) {
                me.render(ctx, item);
            });
            return this;
        },
        getEachValues: function (ctx) {

            var template = ctx.currentElTagAttr(this.name);
            var parts = template.split(/:\s*\{/g);
            if (parts.length != 2) {
                throw new Error('Expression  must  [value : {values}]');
            }

            var data = {};
            data.iterVar = $.dt.trim(parts[0]);
            data.iterStat = data.iterVar + 'Stat';

            data.modelName = "{" + $.dt.trim(parts[1]);
            if (data.iterVar.indexOf(",") > -1) {
                var v = data.iterVar.split(",");
                data.iterVar = $.dt.trim(v[0]);
                data.iterStat = $.dt.trim(v[1]);
            }
            return data;
        },
        clean: function (ctx, $currentElement) {
            var $items = $currentElement.siblings();//查找所有之后的兄弟节点
            var me = this;
            $items.each(function (index, item) {
                var $item = $(item);
                if ($item.attr(me.itemKey)==$currentElement.attr('id')) {
                    $item.remove();
                }
            });
            $currentElement.hide();
        },

        addItem: function (ctx, iterStat, $parentElement, $firstItemEl, $lashItemEl,firstItemId) {
            var itemId = ctx.modelCtx.generateId();
            var tagName = this.tagName(ctx);
            if ($lashItemEl == null || $lashItemEl.length == 0) {//第一列
                $firstItemEl.show();
                //$firstItemEl.removeAttr(this.itemKey);
                ctx.options.$parentElement = ctx.options.$currentElement;
                _domTemplate.fn.tagsExecutor(ctx);
                _domTemplate.fn.setDone($firstItemEl, this.name);
                firstItemId=itemId;
                $firstItemEl.attr("id", itemId);
                $firstItemEl.attr(this.itemKey, firstItemId);
                $lashItemEl = $firstItemEl;
            } else {
                var $appendEl = $firstItemEl.clone();
                $appendEl.attr("id", itemId);
                var tagValue = $appendEl.attr(tagName);
                $appendEl.removeAttr(tagName);
                $appendEl.removeAttr(this.lastItemIdKey);
                $appendEl.removeAttr(this.itemKey);

                if (ctx.modelCtx.options.appendType === 'before') {//下拉刷新
                    $firstItemEl.before($appendEl);

                    $firstItemEl.removeAttr(tagName);
                    $firstItemEl.removeAttr(this.lastItemIdKey);

                    $firstItemEl = ctx.options.$currentElement = ctx.options.$parentElement = $parentElement.find('#' + itemId);
                    ctx.cleanDoneTag();
                    _domTemplate.fn.tagsExecutor(ctx, true);
                    $firstItemEl.attr(this.itemKey, firstItemId);
                    $firstItemEl.attr(tagName, tagValue);
                } else {//清空分页和无限上拉刷新

                    $lashItemEl.after($appendEl);
                    $lashItemEl = ctx.options.$currentElement = ctx.options.$parentElement = $parentElement.find('#' + itemId);
                    ctx.cleanDoneTag();
                    _domTemplate.fn.tagsExecutor(ctx, true);
                    $lashItemEl.attr(this.itemKey, firstItemId);
                }

            }
            if (iterStat.last) {
                $firstItemEl.attr(this.lastItemIdKey, itemId);
            }

            return {$firstItemEl: $firstItemEl, $lashItemEl: $lashItemEl,firstItemId:firstItemId};
        },

        render: function (parentCtx, item) {
            var me = this;
            var $firstItemEl = $(item);
            var $parentElement = $firstItemEl.parent();
            var ctx = new Context({$parentElement: $parentElement, $currentElement: $firstItemEl}, parentCtx);
            ctx.modelCtx = parentCtx;
            if (_domTemplate.fn.isDone($firstItemEl, this.name)) {
                return;
            }

            var dataParts = this.getEachValues(ctx);
            var iterVar = dataParts.iterVar, iterStat = dataParts.iterStat, modelName = dataParts.modelName;
            var object = ctx.compile(modelName);

            if (ctx.options.appendType !== 'before' && ctx.options.appendType !== 'after') {//分页方式加载
                this.clean(ctx, $firstItemEl);
            }

            if (!object) {
                return;
            }

            var $lastItemEl = null;
            var lastItemId = $firstItemEl.attr(this.lastItemIdKey);
            if (lastItemId) {
                $lastItemEl = $parentElement.find('#' + lastItemId);
            }

            var firstItemId=$firstItemEl.attr("id"),first = true, last = false, even = false, odd = false, index = 0, length = object.length,
                isObj = length === undefined || isFunction(object);
            $.each(object, function (n, value) {
                first = index != 0 ? false : true;
                last = index == length - 1 ? true : false;
                if (index / 2 == 0) {
                    even = true;
                    odd = false;
                } else {
                    even = false;
                    odd = true;
                }
                if (isObj) {
                    ctx.options.data[iterVar] = {key: n, value: value};
                } else {
                    ctx.options.data[iterVar] = value;
                }
                ctx.options.data[iterStat] = {
                    index: index,
                    size: length,
                    count: index + 1,
                    current: ctx.options.data[iterVar],
                    first: first,
                    last: last,
                    even: even,
                    odd: odd
                };
                var $el = me.addItem(ctx, ctx.options.data[iterStat], $parentElement, $firstItemEl, $lastItemEl,firstItemId);
                $firstItemEl = $el.$firstItemEl;
                $lastItemEl = $el.$lashItemEl;
                firstItemId=$el.firstItemId;
                index++;

            });
            $firstItemEl.attr(this.itemKey, firstItemId?firstItemId:'');

        }
    };

    /**
     * 标签执行器
     * @param ctx
     */
    _domTemplate.fn.tagsExecutor = function (ctx) {

        _domTemplate.fn.eachTag.execute(ctx);//递归执行each标签

        var attrListStr = _domTemplate.fn.supportAttrs.join('],[' + ctx.options.prefix);
        attrListStr = '[' + ctx.options.prefix + attrListStr + ']';
        var attrTag = _domTemplate.fn.tags.attr;

        var $items = ctx.find(attrListStr); //执行属性标签
        $items.each(function (index, item) {
            attrTag.executeAttrTag(ctx, item);
        });

        var tags = this.tags, currentTag, tagName, $currentEl, attrValue, isEachChunk;
        for (var tag in tags) {//执行自定义标签
            currentTag = tags[tag];
            tagName = ctx.options.prefix + currentTag.name;
            $items = ctx.find('[' + tagName + ']');
            try {
                $items.each(function (index, item) {
                    $currentEl = ctx.options.$currentElement = $(item);
                    isEachChunk = _domTemplate.fn.eachTag.isEachChunk($currentEl);
                    //已经执行过的模板或者是each标签下面的模板不执行
                    if (_domTemplate.fn.isDone($currentEl, currentTag.name) || isEachChunk) {
                        return;
                    }
                    attrValue = ctx.currentElTagAttr(currentTag.name);
                    if (attrValue) {
                        currentTag.render(ctx, currentTag.name, attrValue);
                        _domTemplate.fn.setDone($currentEl, currentTag.name);
                    }
                });

            } catch (e) {
                console.error("execute tag [" + tag + "] error:");
                console.error(e);
            }
        }
    };

    _domTemplate.fn.tags = {

        'attr': {
            name: 'attr',
            tagName: function (ctx) {
                return ctx.options.prefix + this.name;
            },
            executeAttrTag: function (ctx, item) {
                var me = this, name, value, isEachChunk, tag;
                $.each(item.attributes, function (i, attr) {
                    ctx.options.$currentElement = $(item);

                    if (attr.name.indexOf(ctx.options.prefix) === 0) {
                        name = attr.name.substr(ctx.options.prefixLength);
                        value = attr.value;
                        isEachChunk = _domTemplate.fn.eachTag.isEachChunk(ctx.options.$currentElement);
                        if (_domTemplate.fn.isDone(ctx.options.$currentElement, name) || isEachChunk) {
                            return;
                        }
                        tag = _domTemplate.fn.tags[name];
                        if (tag) {//不需要在这里解析
                            tag.render(ctx, name, value);
                        } else if (_domTemplate.fn.supportAttrs.indexOf(name) > -1) {
                            me.render(ctx, name, value);
                        }
                        _domTemplate.fn.setDone(ctx.options.$currentElement, name);
                    }
                });
            },
            render: function (ctx, name, exp) {
                if (name === this.name) {
                    var attrs = exp.split(",");
                    for (var i = 0; i < attrs.length; i++) {
                        var pairs = attrs[i].split("=");
                        if (pairs.length === 2) {
                            this.renderAttr(ctx, $.dt.trim(pairs[0]), pairs[1]);
                        }
                    }
                } else {
                    this.renderAttr(ctx, name, exp);
                }
            },
            renderAttr: function (ctx, name, exp) {
                var result = ctx.tpl(exp,name==='html'?ctx.options.escape:ctx.options.attrEscape);
                if (result == null) {
                    return;
                }
                ctx.currentElTagAttr(name, result);
            }
        },
        'if': {
            name: 'if',
            render: function (ctx, name, exp) {
                if (!ctx.compile(exp)) {
                    ctx.options.$currentElement.remove();
                }
            }
        },
        'unless': {
            name: 'unless',
            render: function (ctx, name, exp) {
                if (ctx.compile(exp)) {
                    ctx.options.$currentElement.remove();
                }
            }
        },
        'switch': {
            name: 'switch',
            caseName: function (ctx) {
                return ctx.options.prefix + 'case';
            },
            render: function (ctx, name, exp) {
                var result = ctx.compile(exp);
                var $el = ctx.options.$currentElement;
                var $caseEl = $el.find('[' + this.caseName(ctx) + '="' + result + '"]');
                $caseEl = $caseEl.length > 0 ? $caseEl : $el.find('[' + this.caseName(ctx) + '="*"]');
                $el.empty();
                $el.html($caseEl.clone());
            }
        },
        'todo': {
            name: 'todo',
            render: function (ctx, name, exp) {
                var result = ctx.compile(exp);
                var $el = ctx.options.$currentElement;
                var $caseEl = $el.find('[' + this.caseName(ctx) + '="' + result + '"]');
                $caseEl = $caseEl.length > 0 ? $caseEl : $el.find('[' + this.caseName(ctx) + '="*"]');
                $el.empty();
                $el.html($caseEl.clone());
            }
        }

    };

    $.dt.execute = function (ctx) {
        _domTemplate.fn.executeModel(ctx);
    };

    /**
     * 注册标签
     * @param name 标签名称
     * @param fn  处理逻辑
     */
    $.dt.registerTag = function (name, fn) {
        _domTemplate.fn.tags[name] = {'name': name, 'render': fn};
    };

    /**
     * 删除标签
     * @param name 标签名称
     */
    $.dt.unregisterTag = function (name) {
        _domTemplate.fn.tags[name] = undefined;
        delete _domTemplate.fn.tags[name];
    };

    /**
     * 注册支持dom 标签属性
     * @param name 属性名称
     */
    $.dt.registerSupportAttr = function (name) {
        _domTemplate.fn.supportAttrs.push(name)
    };
    /**
     * 删除支持dom 标签属性
     * @param name 属性名称
     */
    $.dt.unregisterSupportAttr = function (name) {
        var attrTags = _domTemplate.fn.supportAttrs;
        var len = attrTags.length;
        for (var i = 0; i < len; i++) {
            if (attrTags[i] === name) {
                attrTags.splice(i, 1);
                break;
            }
        }
    };

    /**
     * 获得model
     * @param name model名称
     * @returns {Model}
     */
    $.dt.getModel = function (name) {
        return _domTemplate.fn.getModel(name);
    };

    /**
     * 查找dom中定义的model
     * @param selector 选择器
     * @returns {Array}
     */
    $.dt.getModelsBySelector = function (selector) {
        var modelName = _domTemplate.fn.modelTag.parseModelName(selector);
        var models = [];
        for (var i = 0; i < modelName.length; i++) {
            models.push($.dt.getModel(modelName[i]));
        }
        return models;
    };

    /**
     * 渲染页面 会自动加载model 数据
     * 用法：$.dt.init([options]);
     * @param options
     * @param callback 渲染完成回调函数
     */
    $.dt.init = function (options, callback) {
        _domTemplate.fn.init(options, callback);
    };

    /**
     * jquery方式渲染页面
     * @param options
     */
    $.fn.domTemplate = function (options, callback) {
        if (isFunction(options)) {
            options = {callback: options};
        } else {
            options = options || {};
            options.callback = callback;
        }

        this.each(function (index, item) {
            options.$parentElement = $(item);
            var ctx = new Context(options);
            ctx.modelCtx = ctx;
            $.dt.execute(ctx);
        });
    };

})($);
