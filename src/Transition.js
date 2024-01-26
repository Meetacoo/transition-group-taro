import React, { createContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

import config from "./config";
import TransitionGroupContext, { useContext, Provider } from "./TransitionGroupContext";
import { forceReflow } from "./utils/reflow";
import { useDidShow, useLaunch, useUnload } from "@tarojs/taro";

// const context = createContext({});
// const { Provider } = context;

export const UNMOUNTED = "unmounted";
export const EXITED = "exited";
export const ENTERING = "entering";
export const ENTERED = "entered";
export const EXITING = "exiting";

/**
 * The Transition component lets you describe a transition from one component
 * state to another _over time_ with a simple declarative API. Most commonly
 * it's used to animate the mounting and unmounting of a component, but can also
 * be used to describe in-place transition states as well.
 *
 * ---
 *
 * **Note**: `Transition` is a platform-agnostic base component. If you're using
 * transitions in CSS, you'll probably want to use
 * [`CSSTransition`](https://reactcommunity.org/react-transition-group/css-transition)
 * instead. It inherits all the features of `Transition`, but contains
 * additional features necessary to play nice with CSS transitions (hence the
 * name of the component).
 *
 * ---
 *
 * By default the `Transition` component does not alter the behavior of the
 * component it renders, it only tracks "enter" and "exit" states for the
 * components. It's up to you to give meaning and effect to those states. For
 * example we can add styles to a component when it enters or exits:
 *
 * ```jsx
 * import { Transition } from 'react-transition-group';
 * import { useRef } from 'react';
 *
 * const duration = 300;
 *
 * const defaultStyle = {
 *   transition: `opacity ${duration}ms ease-in-out`,
 *   opacity: 0,
 * }
 *
 * const transitionStyles = {
 *   entering: { opacity: 1 },
 *   entered:  { opacity: 1 },
 *   exiting:  { opacity: 0 },
 *   exited:  { opacity: 0 },
 * };
 *
 * function Fade({ in: inProp }) {
 *   const nodeRef = useRef(null);
 *   return (
 *     <Transition nodeRef={nodeRef} in={inProp} timeout={duration}>
 *       {state => (
 *         <div ref={nodeRef} style={{
 *           ...defaultStyle,
 *           ...transitionStyles[state]
 *         }}>
 *           I'm a fade Transition!
 *         </div>
 *       )}
 *     </Transition>
 *   );
 * }
 * ```
 *
 * There are 4 main states a Transition can be in:
 *  - `'entering'`
 *  - `'entered'`
 *  - `'exiting'`
 *  - `'exited'`
 *
 * Transition state is toggled via the `in` prop. When `true` the component
 * begins the "Enter" stage. During this stage, the component will shift from
 * its current transition state, to `'entering'` for the duration of the
 * transition and then to the `'entered'` stage once it's complete. Let's take
 * the following example (we'll use the
 * [useState](https://reactjs.org/docs/hooks-reference.html#usestate) hook):
 *
 * ```jsx
 * import { Transition } from 'react-transition-group';
 * import { useState, useRef } from 'react';
 *
 * function App() {
 *   const [inProp, setInProp] = useState(false);
 *   const nodeRef = useRef(null);
 *   return (
 *     <div>
 *       <Transition nodeRef={nodeRef} in={inProp} timeout={500}>
 *         {state => (
 *           // ...
 *         )}
 *       </Transition>
 *       <button onClick={() => setInProp(true)}>
 *         Click to Enter
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * When the button is clicked the component will shift to the `'entering'` state
 * and stay there for 500ms (the value of `timeout`) before it finally switches
 * to `'entered'`.
 *
 * When `in` is `false` the same thing happens except the state moves from
 * `'exiting'` to `'exited'`.
 */

const TransitionInner = ({ children, ...props }) => {
  const parentGroup = useContext();
  const [status, setStatus] = useState(null);

  console.log(parentGroup, this, children);

  const appearStatus = useRef(null);
  const nextCallback = useRef(null);

  useEffect(() => {
    const appear = parentGroup && !parentGroup.isMounting ? props.enter : props.appear;
    if (props.in) {
      if (appear) {
        setStatus(EXITED);
        appearStatus.current = ENTERING;
      } else {
        setStatus(ENTERED);
      }
    } else {
      if (props.unmountOnExit || props.mountOnEnter) {
        setStatus(UNMOUNTED);
      } else {
        setStatus(EXITED);
      }
    }
    nextCallback.current = null;
  }, [props]);

  const cancelNextCallback = () => {
    if (nextCallback.current !== null) {
      nextCallback.current.cancel();
      nextCallback.current = null;
    }
  };

  const getTimeouts = () => {
    const { timeout } = props;
    let exit, enter, appear;

    exit = enter = appear = timeout;

    if (timeout != null && typeof timeout !== "number") {
      exit = timeout.exit;
      enter = timeout.enter;
      // TODO: remove fallback for next major
      appear = timeout.appear !== undefined ? timeout.appear : enter;
    }
    return { exit, enter, appear };
  };

  const setNextCallback = (callback) => {
    let active = true;

    nextCallback.current = (event) => {
      if (active) {
        active = false;
        nextCallback.current = null;

        callback(event);
      }
    };

    nextCallback.current.cancel = () => {
      active = false;
    };

    return nextCallback.current;
  };

  const safeSetState = (nextState, callback) => {
    // This shouldn't be necessary, but there are weird race conditions with
    // setState callbacks and unmounting in testing, so always make sure that
    // we can cancel any pending setState callbacks after we unmount.
    setStatus(nextState);
    setNextCallback(callback)?.();
  };

  const onTransitionEnd = (timeout, handler) => {
    setNextCallback(handler);
    const node = props.nodeRef
      ? props.nodeRef.current
      : ReactDOM.findDOMNode(this);

    const doesNotHaveTimeoutOrListener = timeout == null && !props.addEndListener;
    if (!node || doesNotHaveTimeoutOrListener) {
      setTimeout(nextCallback.current, 0);
      return;
    }

    if (props.addEndListener) {
      const [maybeNode, maybeNextCallback] = props.nodeRef
        ? [nextCallback.current]
        : [node, nextCallback.current];
      props.addEndListener(maybeNode, maybeNextCallback);
    }

    if (timeout != null) {
      setTimeout(nextCallback.current, timeout);
    }
  };

  const performEnter = (mounting) => {
    const { enter } = props;
    const appearing = parentGroup ? parentGroup.isMounting : mounting;
    const [maybeNode, maybeAppearing] = props.nodeRef
      ? [appearing]
      : [ReactDOM.findDOMNode(this), appearing];

    const timeouts = getTimeouts();
    const enterTimeout = appearing ? timeouts.appear : timeouts.enter;
    // no enter animation skip right to ENTERED
    // if we are mounting and running this it means appear _must_ be set
    if ((!mounting && !enter) || config.disabled) {
      safeSetState(ENTERED, () => {
        props.onEntered(maybeNode);
      });
      return;
    }

    props.onEnter(maybeNode, maybeAppearing);

    safeSetState(ENTERING, () => {
      props.onEntering(maybeNode, maybeAppearing);

      onTransitionEnd(enterTimeout, () => {
        safeSetState(ENTERED, () => {
          props.onEntered(maybeNode, maybeAppearing);
        });
      });
    });
  };

  const performExit = () => {
    const { exit } = props;
    const timeouts = getTimeouts();
    const maybeNode = props.nodeRef
      ? undefined
      : ReactDOM.findDOMNode(this);

    // no exit animation skip right to EXITED
    if (!exit || config.disabled) {
      safeSetState(EXITED, () => {
        props.onExited(maybeNode);
      });
      return;
    }

    props.onExit(maybeNode);

    safeSetState(EXITING, () => {
      props.onExiting(maybeNode);

      onTransitionEnd(timeouts.exit, () => {
        safeSetState(EXITED, () => {
          props.onExited(maybeNode);
        });
      });
    });
  };

  const updateStatus = (mounting = false, nextStatus) => {
    if (nextStatus !== null) {
      // nextStatus will always be ENTERING or EXITING.
      cancelNextCallback();

      if (nextStatus === ENTERING) {
        if (props.unmountOnExit || props.mountOnEnter) {
          const node = props.nodeRef
            ? props.nodeRef.current
            : ReactDOM.findDOMNode(this);
          // https://github.com/reactjs/react-transition-group/pull/749
          // With unmountOnExit or mountOnEnter, the enter animation should happen at the transition between `exited` and `entering`.
          // To make the animation happen,  we have to separate each rendering and avoid being processed as batched.
          if (node) forceReflow(node);
        }
        performEnter(mounting);
      } else {
        performExit();
      }
    } else if (props.unmountOnExit && status === EXITED) {
      setStatus(UNMOUNTED);
    }
  };
  useLaunch(() => {
    updateStatus(true, appearStatus.current);
  });

  useDidShow((prevProps) => {
    let nextStatus = null;
    if (prevProps !== props) {
      if (props.in) {
        if (status !== ENTERING && status !== ENTERED) {
          nextStatus = ENTERING;
        }
      } else {
        if (status === ENTERING || status === ENTERED) {
          nextStatus = EXITING;
        }
      }
    }
    updateStatus(false, nextStatus);
  });

  useUnload(() => {
    cancelNextCallback();
  });

  return status === UNMOUNTED ? null : (
    <>
      {
        typeof children === "function"
          ? children(status, props)
          : React.cloneElement(React.Children.only(children), props)
      }
    </>
  );
};
const Transition = ({ ...props }) => {
  return (
    <Provider value={null}>
      <TransitionInner {...props} />
    </Provider>
  );
};

Transition.defaultProps = {
  in: false,
  mountOnEnter: false,
  unmountOnExit: false,
  appear: false,
  enter: true,
  exit: true,

  onEnter: () => {
  },
  onEntering: () => {
  },
  onEntered: () => {
  },

  onExit: () => {
  },
  onExiting: () => {
  },
  onExited: () => {
  }
};

Transition.UNMOUNTED = UNMOUNTED;
Transition.EXITED = EXITED;
Transition.ENTERING = ENTERING;
Transition.ENTERED = ENTERED;
Transition.EXITING = EXITING;

export default Transition;
