import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LMSClient } from "../api/client";
import Loading from "../ui/Loading";

/**
 * PUBLIC_INTERFACE
 * EnrollmentContext - provides enrolled course ids and actions.
 */
const EnrollmentContext = createContext({
  enrolledIds: new Set(),
  loading: false,
  refresh: async () => {},
  enroll: async (_id) => {},
  unenroll: async (_id) => {},
});

export function EnrollmentProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [enrolledIds, setEnrolledIds] = useState(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const courses = await LMSClient.myCourses();
      setEnrolledIds(new Set(courses.map((c) => c.id)));
    } catch {
      setEnrolledIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  const enroll = useCallback(async (courseId) => {
    await LMSClient.enroll(courseId);
    await refresh();
  }, [refresh]);

  const unenroll = useCallback(async (courseId) => {
    await LMSClient.unenroll(courseId);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      enrolledIds,
      loading,
      refresh,
      enroll,
      unenroll,
    }),
    [enrolledIds, loading, refresh, enroll, unenroll]
  );

  return (
    <EnrollmentContext.Provider value={value}>
      {loading ? <Loading label="Loading enrollments..." /> : children}
    </EnrollmentContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useEnrollments - convenience hook to access enrollment state.
 */
export function useEnrollments() {
  return useContext(EnrollmentContext);
}
