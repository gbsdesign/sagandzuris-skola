import React from 'react';
import { useAuth } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { ManeraContent } from '../views/ManeraPanel';
import { ClassLessons } from './ClassLessons';

// „ოსტატობა“ on the path page (it used to be „მანერა“): the lessons of my classes, step by step, then the nine
// performance tips with my teachers' marks.
export const MasteryContent: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  return (
    <div className="space-y-5">
      {classes.map(c => <ClassLessons key={c.id} cls={c} canEdit={false} bare showClassName={classes.length > 1} />)}
      <div>
        <h2 className="mb-1 px-1 font-serif-ge text-lg font-bold text-[#4a3426]">რჩევები</h2>
        <ManeraContent />
      </div>
    </div>
  );
};
