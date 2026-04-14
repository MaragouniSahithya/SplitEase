import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { getMe } from '../lib/api';

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isLoading: true,
  pendingInvites: 0,
  isFirstLogin: false
};

const AuthContext = createContext({
  ...initialState,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  setPendingInvites: () => {},
  setIsFirstLogin: () => {},
  isAuthenticated: false,
});

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        pendingInvites: action.payload.pendingInvites || 0,
        isFirstLogin: action.payload.isFirstLogin || false,
        isLoading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        pendingInvites: 0,
        isFirstLogin: false,
        isLoading: false
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'SET_PENDING_INVITES':
      return { ...state, pendingInvites: action.payload };
    case 'SET_IS_FIRST_LOGIN':
      return { ...state, isFirstLogin: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await getMe();
          dispatch({
            type: 'LOGIN',
            payload: {
              user: data.user || data,
              token,
              pendingInvites: data.pendingInvites || 0,
              isFirstLogin: false // Usually false on page reload
            }
          });
        } catch (error) {
          console.error("Failed to fetch user, logging out", error);
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initAuth();
  }, []);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    dispatch({
      type: 'LOGIN',
      payload: {
        user: data.user,
        token: data.token,
        pendingInvites: data.pendingInvites || 0,
        isFirstLogin: data.isFirstLogin || false
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const setPendingInvites = (count) => {
    dispatch({ type: 'SET_PENDING_INVITES', payload: count });
  };

  const setIsFirstLogin = (status) => {
    dispatch({ type: 'SET_IS_FIRST_LOGIN', payload: status });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.token && !!state.user,
        login,
        logout,
        updateUser,
        setPendingInvites,
        setIsFirstLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
