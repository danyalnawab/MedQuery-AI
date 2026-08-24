# Dec. 26 8:20 PM

Starting devlog to clean up app.

Changes:
    - Changed the while loop to an if as streamlit doesn't work well with while loops.
    - Replaced the return feedback, if the DB doesn't return any relevant results it'll say "Unable to find matching results."
    -Separated response content from metadata display (improves readability):
        st.markdown("### Response")
        st.write(response_text)

        with st.expander("Sources"):
            for s in sources:
                st.write(s)