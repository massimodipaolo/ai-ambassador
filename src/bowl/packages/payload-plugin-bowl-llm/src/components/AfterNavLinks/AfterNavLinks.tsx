import { Chevron } from 'payload/components';
import { useConfig } from 'payload/components/utilities';
import React from 'react';
import { NavLink } from 'react-router-dom';

const baseClass = 'after-nav-links';

const AfterNavLinks: React.FC = () => {
  const { routes: { admin: adminRoute } } = useConfig();
  return (
    <div className={baseClass}>
      <span className="nav__label">LLM TEST</span>
      <nav>
        <NavLink
          className="nav__link"
          activeClassName="active"
          to={`${adminRoute}/llm-test`}
        >
          <Chevron />
          Llm Test
        </NavLink>
      </nav>
    </div>
  );
};

export default AfterNavLinks;
