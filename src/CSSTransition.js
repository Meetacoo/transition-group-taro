import addOneClass from "dom-helpers/addClass";

import removeOneClass from "dom-helpers/removeClass";
import React from "react";

import Transition from "./Transition";
import { forceReflow } from "./utils/reflow";

const addClass = (node, classes) =>
  node && classes && classes.split(" ").forEach((c) => addOneClass(node, c));
const removeClass = (node, classes) =>
  node && classes && classes.split(" ").forEach((c) => removeOneClass(node, c));

/**
 * A transition component inspired by the excellent
 * [ng-animate](https://docs.angularjs.org/api/ngAnimate) library, you should
 * use it if you're using CSS transitions or animations. It's built upon the
 * [`Transition`](https://reactcommunity.org/react-transition-group/transition)
 * component, so it inherits all of its props.
 *
 * `CSSTransition` applies a pair of class names during the `appear`, `enter`,
 * and `exit` states of the transition. The first class is applied and then a
 * second `*-active` class in order to activate the CSS transition. After the
 * transition, matching `*-done` class names are applied to persist the
 * transition state.
 *
 * ```jsx
 * function App() {
 *   const [inProp, setInProp] = useState(false);
 *   const nodeRef = useRef(null);
 *   return (
 *     <div>
 *       <CSSTransition nodeRef={nodeRef} in={inProp} timeout={200} classNames="my-node">
 *         <div ref={nodeRef}>
 *           {"I'll receive my-node-* classes"}
 *         </div>
 *       </CSSTransition>
 *       <button type="button" onClick={() => setInProp(true)}>
 *         Click to Enter
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * When the `in` prop is set to `true`, the child component will first receive
 * the class `example-enter`, then the `example-enter-active` will be added in
 * the next tick. `CSSTransition` [forces a
 * reflow](https://github.com/reactjs/react-transition-group/blob/5007303e729a74be66a21c3e2205e4916821524b/src/CSSTransition.js#L208-L215)
 * between before adding the `example-enter-active`. This is an important trick
 * because it allows us to transition between `example-enter` and
 * `example-enter-active` even though they were added immediately one after
 * another. Most notably, this is what makes it possible for us to animate
 * _appearance_.
 *
 * ```css
 * .my-node-enter {
 *   opacity: 0;
 * }
 * .my-node-enter-active {
 *   opacity: 1;
 *   transition: opacity 200ms;
 * }
 * .my-node-exit {
 *   opacity: 1;
 * }
 * .my-node-exit-active {
 *   opacity: 0;
 *   transition: opacity 200ms;
 * }
 * ```
 *
 * `*-active` classes represent which styles you want to animate **to**, so it's
 * important to add `transition` declaration only to them, otherwise transitions
 * might not behave as intended! This might not be obvious when the transitions
 * are symmetrical, i.e. when `*-enter-active` is the same as `*-exit`, like in
 * the example above (minus `transition`), but it becomes apparent in more
 * complex transitions.
 *
 * **Note**: If you're using the
 * [`appear`](http://reactcommunity.org/react-transition-group/transition#Transition-prop-appear)
 * prop, make sure to define styles for `.appear-*` classes as well.
 */
const CSSTransition = ({ classNames, ...props }) => {
  const [appliedClasses, setAppliedClasses] = useState({
    appear: {},
    enter: {},
    exit: {}
  });

  const removeClasses = (node, type) => {
    const {
      base: baseClassName,
      active: activeClassName,
      done: doneClassName
    } = appliedClasses[type];

    setAppliedClasses(prev => Object.assign({}, prev, {[appliedClasses[type]]: {}}));

    if (baseClassName) {
      removeClass(node, baseClassName);
    }
    if (activeClassName) {
      removeClass(node, activeClassName);
    }
    if (doneClassName) {
      removeClass(node, doneClassName);
    }
  }

  const onEnter = (maybeNode, maybeAppearing) => {
    const [node, appearing] = resolveArguments(maybeNode, maybeAppearing);
    removeClasses(node, "exit");
    addClass(node, appearing ? "appear" : "enter", "base");

    if (props.onEnter) {
      props.onEnter(maybeNode, maybeAppearing);
    }
  };

  const onEntering = (maybeNode, maybeAppearing) => {
    const [node, appearing] = resolveArguments(maybeNode, maybeAppearing);
    const type = appearing ? "appear" : "enter";
    addClass(node, type, "active");

    if (props.onEntering) {
      props.onEntering(maybeNode, maybeAppearing);
    }
  };

  const onEntered = (maybeNode, maybeAppearing) => {
    const [node, appearing] = resolveArguments(maybeNode, maybeAppearing);
    const type = appearing ? "appear" : "enter";
    removeClasses(node, type);
    addClass(node, type, "done");

    if (props.onEntered) {
      props.onEntered(maybeNode, maybeAppearing);
    }
  };

  const onExit = (maybeNode) => {
    const [node] = resolveArguments(maybeNode);
    removeClasses(node, "appear");
    removeClasses(node, "enter");
    addClass(node, "exit", "base");

    if (props.onExit) {
      props.onExit(maybeNode);
    }
  };

  const onExiting = (maybeNode) => {
    const [node] = resolveArguments(maybeNode);
    addClass(node, "exit", "active");

    if (props.onExiting) {
      props.onExiting(maybeNode);
    }
  };

  const onExited = (maybeNode) => {
    const [node] = resolveArguments(maybeNode);
    removeClasses(node, "exit");
    addClass(node, "exit", "done");

    if (props.onExited) {
      props.onExited(maybeNode);
    }
  };

  // when prop `nodeRef` is provided `node` is excluded
  const resolveArguments = (maybeNode, maybeAppearing) =>
    props.nodeRef
      ? [props.nodeRef.current, maybeNode] // here `maybeNode` is actually `appearing`
      : [maybeNode, maybeAppearing]; // `findDOMNode` was used

  const getClassNames = (type) => {
    const isStringClassNames = typeof classNames === "string";
    const prefix = isStringClassNames && classNames ? `${classNames}-` : "";

    let baseClassName = isStringClassNames
      ? `${prefix}${type}`
      : classNames[type];

    let activeClassName = isStringClassNames
      ? `${baseClassName}-active`
      : classNames[`${type}Active`];

    let doneClassName = isStringClassNames
      ? `${baseClassName}-done`
      : classNames[`${type}Done`];

    return {
      baseClassName,
      activeClassName,
      doneClassName
    };
  };

  const addClass = (node, type, phase) => {
    let className = getClassNames(type)[`${phase}ClassName`];
    const { doneClassName } = getClassNames("enter");

    if (type === "appear" && phase === "done" && doneClassName) {
      className += ` ${doneClassName}`;
    }

    // This is to force a repaint,
    // which is necessary in order to transition styles when adding a class name.
    if (phase === "active") {
      if (node) forceReflow(node);
    }

    if (className) {
      appliedClasses[type][phase] = className;
      addClass(node, className);
    }
  }
  console.log("render", props);

  return (
    <Transition
      {...props}
      onEnter={onEnter}
      onEntered={onEntered}
      onEntering={onEntering}
      onExit={onExit}
      onExiting={onExiting}
      onExited={onExited}
    />
  );
};

export default CSSTransition;
