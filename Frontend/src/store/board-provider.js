import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import boardContext from './board-context';
import { TOOL_ITEMS, BOARD_ACTIONS, TOOL_ACTION_TYPES } from '../constants';
import { createRoughElement, getSvgPathFromStroke, isPointNearElement } from '../utils/element';
import getStroke from 'perfect-freehand';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const BASE_URL = "https://white-board-app-aww3.onrender.com";

const socket = io(BASE_URL, {
  transports: ["websocket"],
  withCredentials: true,
  auth: { token: localStorage.getItem("token") }
});

const initialBoardState = {
  activeToolItem: TOOL_ITEMS.BRUSH,
  toolActionType: TOOL_ACTION_TYPES.NONE,
  elements: [],
  history: [[]],
  index: 0,
  loading: true,
};

const boardReducer = (state, action) => {
  switch (action.type) {
    case BOARD_ACTIONS.SET_ELEMENTS:
      return {
        ...state,
        elements: action.payload.elements,
        history: [action.payload.elements],
        index: 0,
        loading: false,
      };
    case BOARD_ACTIONS.CHANGE_TOOL:
      return { ...state, activeToolItem: action.payload.tool };
    case BOARD_ACTIONS.CHANGE_ACTION_TYPE:
      return { ...state, toolActionType: action.payload.actionType };
    case BOARD_ACTIONS.DRAW_DOWN: {
      const { clientX, clientY, stroke, fill, size } = action.payload;
      const newElement = createRoughElement(
        state.elements.length, clientX, clientY, clientX, clientY,
        { type: state.activeToolItem, stroke, fill, size }
      );
      return {
        ...state,
        toolActionType: state.activeToolItem === TOOL_ITEMS.TEXT ? TOOL_ACTION_TYPES.WRITING : TOOL_ACTION_TYPES.DRAWING,
        elements: [...state.elements, newElement],
      };
    }
    case BOARD_ACTIONS.DRAW_MOVE: {
      const { clientX, clientY } = action.payload;
      const newElements = [...state.elements];
      const index = state.elements.length - 1;
      const { x1, y1, stroke, fill, size, type } = newElements[index];

      switch (type) {
        case TOOL_ITEMS.LINE:
        case TOOL_ITEMS.RECTANGLE:
        case TOOL_ITEMS.CIRCLE:
        case TOOL_ITEMS.ARROW:
          newElements[index] = createRoughElement(index, x1, y1, clientX, clientY, { type, stroke, fill, size });
          return { ...state, elements: newElements };
        case TOOL_ITEMS.BRUSH:
          newElements[index].points = [...newElements[index].points, { x: clientX, y: clientY }];
          newElements[index].path = new Path2D(getSvgPathFromStroke(getStroke(newElements[index].points)));
          return { ...state, elements: newElements };
        default:
          return state;
      }
    }
    case BOARD_ACTIONS.ERASE: {
      const { clientX, clientY } = action.payload;
      const newElements = state.elements.filter((element) => !isPointNearElement(element, { pointX: clientX, pointY: clientY }));
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      return { ...state, elements: newElements, history: newHistory, index: state.index + 1 };
    }
    case BOARD_ACTIONS.CHANGE_TEXT: {
      const index = state.elements.length - 1;
      const newElements = [...state.elements];
      newElements[index].text = action.payload.text;
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      return { ...state, toolActionType: TOOL_ACTION_TYPES.NONE, elements: newElements, history: newHistory, index: state.index + 1 };
    }
    case BOARD_ACTIONS.DRAW_UP: {
      const elementsCopy = [...state.elements];
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(elementsCopy);
      return { ...state, history: newHistory, index: state.index + 1 };
    }
    case BOARD_ACTIONS.UNDO:
      if (state.index <= 0) return state;
      return { ...state, elements: state.history[state.index - 1], index: state.index - 1 };
    case BOARD_ACTIONS.REDO:
      if (state.index >= state.history.length - 1) return state;
      return { ...state, elements: state.history[state.index + 1], index: state.index + 1 };
    default:
      return state;
  }
};

const hydrateElements = (fetchedElements) => {
  return fetchedElements.map((el, index) => {
    switch (el.type) {
      case TOOL_ITEMS.BRUSH:
        el.path = new Path2D(getSvgPathFromStroke(getStroke(el.points)));
        return el;
      case TOOL_ITEMS.LINE:
      case TOOL_ITEMS.RECTANGLE:
      case TOOL_ITEMS.CIRCLE:
      case TOOL_ITEMS.ARROW:
        el.roughElement = createRoughElement(index, el.x1, el.y1, el.x2, el.y2, { type: el.type, stroke: el.stroke, fill: el.fill, size: el.size }).roughElement;
        return el;
      default:
        return el;
    }
  });
};

const BoardProvider = ({ children }) => {
  const [boardState, dispatchBoardAction] = useReducer(boardReducer, initialBoardState);
  const { id } = useParams();
  const isSocketUpdate = useRef(false); 

  useEffect(() => {
    const token = localStorage.getItem("token");

    async function fetchCanvas() {
      try {
        const res = await fetch(`${BASE_URL}/canvas/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const hydrated = hydrateElements(data.elements);
        dispatchBoardAction({ type: BOARD_ACTIONS.SET_ELEMENTS, payload: { elements: hydrated, name: data.name || "" } });
        socket.emit("joinCanvas", id);
      } catch (err) {
        console.error("Failed to fetch canvas:", err);
      }
    }

    if (id) fetchCanvas();

    socket.on("canvasUpdated", (allElements) => {
      isSocketUpdate.current = true; 
      dispatchBoardAction({ type: BOARD_ACTIONS.SET_ELEMENTS, payload: { elements: hydrateElements(allElements) } });
    });

    return () => {
      socket.off("canvasUpdated");
    };
  }, [id]);

  useEffect(() => {
    if (!boardState.loading) {
      if (isSocketUpdate.current) {
        isSocketUpdate.current = false;
      } else {
        socket.emit("updateCanvas", { canvasId: id, data: boardState.elements });
      }
    }
  }, [boardState.elements, id, boardState.loading]);

  const handleActiveToolItemClick = (tool) =>
    dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_TOOL, payload: { tool } });

  const handleMouseDown = (event, toolBoxState) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    const { clientX, clientY } = event;
    if (boardState.activeToolItem === TOOL_ITEMS.ERASER) {
      dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_ACTION_TYPE, payload: { actionType: TOOL_ACTION_TYPES.ERASING } });
    } else {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_DOWN,
        payload: {
          clientX,
          clientY,
          stroke: toolBoxState[boardState.activeToolItem]?.stroke,
          fill: toolBoxState[boardState.activeToolItem]?.fill,
          size: toolBoxState[boardState.activeToolItem]?.size,
        },
      });
    }
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;

    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.DRAW_MOVE, payload: { clientX, clientY } });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.ERASE, payload: { clientX, clientY } });
    }
  };

  const handleMouseUp = (event) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.DRAW_UP });
    }
    dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_ACTION_TYPE, payload: { actionType: TOOL_ACTION_TYPES.NONE } });
  };

  const textAreaBlurhandler = (text) => {
    dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_TEXT, payload: { text } });
  };

  const undoboardHandler = useCallback(() => dispatchBoardAction({ type: BOARD_ACTIONS.UNDO }), []);
  const redoBoardhandler = useCallback(() => dispatchBoardAction({ type: BOARD_ACTIONS.REDO }), []);

  const boardContextValue = {
    activeToolItem: boardState.activeToolItem,
    handleActiveToolItemClick,
    elements: boardState.elements,
    toolActionType: boardState.toolActionType,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    textAreaBlur: textAreaBlurhandler,
    undo: undoboardHandler,
    redo: redoBoardhandler,
  };

  return <boardContext.Provider value={boardContextValue}>{children}</boardContext.Provider>;
};

export default BoardProvider;