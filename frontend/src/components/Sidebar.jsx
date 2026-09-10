import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Sidebar component used in the main layout.
 * Receives an array of navigation items:
 *   [{ path, label, icon: IconComponent, badge? }]
 *
 * The component renders the branding, operational unit placeholder,
 * the navigation list with active styling, and a footer.
 */
export default function Sidebar({ navItems }) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Branding */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-slate-800">Fuel Monitoring</h1>
      </div>

      {/* Operational Unit */}
      <div className="p-4 border-b border-slate-200">
        <p className="text-sm text-slate-600">Unit Operasional</p>
        <p className="font-medium text-slate-800">UPKAL2</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-blue-500 text-white rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PT. XYZ</p>
        <p className="mt-1">Support: help@example.com</p>
      </div>
    </aside>
  );
}
