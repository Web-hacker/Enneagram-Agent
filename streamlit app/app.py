import streamlit as st
import requests
import html
import time
import uuid

st.set_page_config(page_title="RAG Agent", layout="wide")

st.sidebar.title("API Endpoints")
page = st.sidebar.radio(
    "Choose an option:",
    (" General Information", " Identify Yourself", " Relationship Advice", " Configure Chatbot", " Upload Documents")

)

# -----------------------
# 1. Chat Interface
# -----------------------

if page == " General Information":
    st.title(" What is the Enneagram?")
    st.subheader("Know more about Enneagram by chatting with our chatbot.")

    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat history
    for msg in st.session_state.messages:
        with st.chat_message("user" if msg["role"] == "user" else "assistant"):
            content = msg["content"]
            if "```" in content:
                blocks = content.split("```")
                for i, block in enumerate(blocks):
                    if i % 2 == 0:
                        st.markdown(block)
                    else:
                        st.code(block)
            else:
                st.markdown(content)
            if msg.get("sources"):
                with st.expander("📄 Sources"):
                    for s in msg["sources"]:
                        st.code(s)

    # Take user input
    user_query = st.chat_input("Ask something...")
    if user_query:
        # Show user message
        st.chat_message("user").markdown(user_query)
        st.session_state.messages.append({"role": "user", "content": user_query})

        # Call backend and render assistant response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    res = requests.post("http://localhost:3000/ask_query", json={"query": user_query})
                    res.raise_for_status()
                    data = res.json()
                    answer = data.get("answer", "No answer returned.")
                    sources = data.get("sources", [])
                    bot_message = st.empty()
                   
                    full_response = ""
                    for chunk in answer:
                       full_response += chunk
                       bot_message.markdown(full_response)
                       time.sleep(0.005)
        

                    if sources:
                        with st.expander("📄 Sources"):
                            for s in sources:
                                st.code(s)

                    # Store bot message in state
                    st.session_state.messages.append({
                        "role": "bot",
                        "content": answer,
                        "sources": sources
                    })

                except Exception as e:
                    st.error(f"⚠️ Error: {e}")
                    st.session_state.messages.append({
                        "role": "bot",
                        "content": f"⚠️ Error: {e}"
                    })

# -----------------------
# 2. Repo Clone
# -----------------------
elif page == " Identify Yourself":
    st.title(" Enneagram Type Discovery")
    st.markdown("Answer the questions to discover your **core type** based on the Enneagram Cards.")

    # Session ID to preserve conversation
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())

    if "conversation" not in st.session_state:
        st.session_state.conversation = []

    for speaker, message in st.session_state.conversation:
        with st.chat_message("user" if speaker == "🧑" else "assistant"):
            content = message
            st.markdown(content)

    # API endpoint for Godspeed backend
    GODSPEED_API_URL = "http://localhost:3000/know_yourself"
    
    if len(st.session_state.conversation) == 0 and st.button("Start"):
        with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                # Send to Godspeed
                    print(st.session_state.session_id)
                    res = requests.post(GODSPEED_API_URL, json={
                            "sessionId": st.session_state.session_id,
                            "userInput": ""
                     })

                    if res.status_code == 200:
                         reply = res.json()['message']
                         bot_message = st.empty()

                         full_response = ""
                         for chunk in reply:
                             full_response += chunk
                             bot_message.markdown(full_response)
                             time.sleep(0.005)

                         st.session_state.conversation.append(("🤖", reply))
                    else:
                         st.error(f"Server error: {res.status_code}")
        
    
    user_input = st.chat_input("Your answer (1-5):", key="input_box")
    if user_input:
        try:
        # Save user message
            st.chat_message("user").markdown(user_input)
            st.session_state.conversation.append(("🧑", user_input))


            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    print(st.session_state.session_id)
                # Send to Godspeed
                    res = requests.post(GODSPEED_API_URL, json={
                            "sessionId": st.session_state.session_id,
                             "userInput": user_input.strip()
                     })

                    if res.status_code == 200:
                         reply = res.json()['message']
                         bot_message = st.empty()

                         full_response = ""
                         for chunk in reply:
                             full_response += chunk
                             bot_message.markdown(full_response)
                             time.sleep(0.005)

                         st.session_state.conversation.append(("🤖", reply))
                    else:
                         st.error(f"Server error: {res.status_code}")
        except Exception as e:
            st.error(f"Request failed: {e}")


# -----------------------
# 3. Configure Chatbot 
# -----------------------
elif page == " Configure Chatbot":
    st.title(" Configure your RAG chatbot.")

    user_openrouterai_key = st.text_input("Enter OPENROUTER.AI API KEY...",placeholder="Your OPENROUTER.AI API key")

    model = st.selectbox(
        "Choose which LLM you want to use",
        ["deepseek/deepseek-r1-0528-qwen3-8b:free","deepseek/deepseek-r1-0528:free","mistralai/devstral-small:free","meta-llama/llama-3.3-8b-instruct:free","deepseek/deepseek-prover-v2:free","tngtech/deepseek-r1t-chimera:free","microsoft/mai-ds-r1:free","moonshotai/kimi-vl-a3b-thinking:free","nvidia/llama-3.3-nemotron-super-49b-v1:free","nvidia/llama-3.1-nemotron-ultra-253b-v1:free","meta-llama/llama-4-maverick:free","meta-llama/llama-4-scout:free","deepseek/deepseek-v3-base:free","deepseek/deepseek-chat-v3-0324:free","deepseek/deepseek-r1-zero:free","nousresearch/deephermes-3-llama-3-8b-preview:free","qwen/qwen2.5-vl-72b-instruct:free","deepseek/deepseek-r1:free","deepseek/deepseek-chat:free","meta-llama/llama-3.3-70b-instruct:free","meta-llama/llama-3.2-1b-instruct:free","meta-llama/llama-3.2-11b-vision-instruct:free","meta-llama/llama-3.1-8b-instruct:free","mistralai/mistral-nemo:free"]
    )

    button = st.button("Configure RAG Chatbot")
    
    if  user_openrouterai_key and model and button:
        with st.spinner("Uploading..."):
            try:
                response = requests.post("http://localhost:3000/configure_llm", json={"apiKey":user_openrouterai_key,"model":model})
                st.success(response.json()["message"])
            except Exception as e:
                st.error(f"Upload failed: {e}")
    else:
        st.write("Please fill all the required fields.")



# -----------------------
# 4. Upload Documents
# -----------------------
elif page == " Upload Documents":
    st.title(" Upload Documents to Vector Store")

    uploaded_file = st.file_uploader("Upload a document", type=["pdf", "docx", "txt", "html", "md"])
    
    if uploaded_file is not None:
        filename = uploaded_file.name
        file_bytes = uploaded_file.read()

        if st.button("Upload and Ingest"):
            with st.spinner("Uploading and ingesting..."):
                try:
                    import base64
                    encoded = base64.b64encode(file_bytes).decode("utf-8")
                    payload = {"filename": filename, "file": encoded}

                    res = requests.post("http://localhost:3000/upload_docs", json=payload)
                    res.raise_for_status()

                    st.success(f"✅ {res.json().get('message', 'File ingested successfully.')}")
                    # st.info(f"Document type: {res.json().get('type')}, Sections: {res.json().get('sections')}")

                except Exception as e:
                    st.error(f"❌ Upload failed: {e}")



# -----------------------
# 5. Relationship Advice
# -----------------------

elif page == " Relationship Advice":


        st.title("Relationship Advice Agent")

        # Ensure session_id exists
        if "relationship_session_id" not in st.session_state:
           st.session_state.relationship_session_id = str(uuid.uuid4())

        # Subpage Selector
        subpage = st.radio("Navigate:", ["1. Relationship Context", "2. Chat with Relationship Guide"])

        # Button to reset session
        if st.button("New Session"):
            st.session_state.relationship_session_id = str(uuid.uuid4())
            st.session_state.relationship_context = {}

        # --------------------------
        # Subpage 1: Configuration
        # --------------------------
        if subpage == "1. Relationship Context":
            st.subheader("🧩 Provide Relationship Context")

            col1, col2 = st.columns(2)
            with col1:
               user_type = st.selectbox("Your Enneagram Type", [f"Type {i}" for i in range(1, 10)])
            with col2:
               partner_type = st.selectbox("Partner's Enneagram Type", [f"Type {i}" for i in range(1, 10)])

            relationship_type = st.selectbox(
                "Relationship Type",
                ["Romantic", "Friendship", "Family", "Professional", "Other"]
            )

            extra_notes = st.text_area("Optional: Describe the relationship, challenges, or goals.")

            if st.button("📥 Save Context"):
                st.session_state.relationship_context = {
                    "user_type": user_type,
                    "partner_type": partner_type,
                    "relationship_type": relationship_type,
                    "extra_notes": extra_notes
                }

                with st.spinner("Saving"):
                    try:
                        payload = {
                            "session_id":st.session_state.relationship_session_id,
                            "user_enegram_type":user_type,
                            "partner_enegram_type":partner_type,
                            "relationship_type":relationship_type,
                            "add_relationship_comment":extra_notes
                        }
                        res = requests.post("http://localhost:3000/relationship_advice_config", json=payload)
                        res.raise_for_status()
                        data = res.json()
                        st.success("Context saved. You can now start the advice chat.")
                    except Exception as e:
                        st.error(f"Error: {e}")

        # --------------------------
        # Subpage 2: Chat Interface
        # --------------------------
        elif subpage == "2. Chat with Relationship Guide":
            st.subheader("💬 Ask for Relationship Advice")

            # Load saved configuration
            context = st.session_state.get("relationship_context", {})

            if not context:
                st.warning("Please fill out the context first in '1. Relationship Context'.")
            else:
                if "relationship_chat_history" not in st.session_state:
                    st.session_state.relationship_chat_history = []

                for msg in st.session_state.relationship_chat_history:
                    with st.chat_message("user" if msg["role"] == "user" else "assistant"):
                        st.markdown(msg["content"])

                user_query = st.chat_input("Ask for guidance...")
                if user_query:
                    st.chat_message("user").markdown(user_query)
                    st.session_state.relationship_chat_history.append({"role": "user", "content": user_query})

                    with st.chat_message("assistant"):
                        with st.spinner("Thinking..."):
                            try:
                                payload = {
                                    "session_id": st.session_state.relationship_session_id,
                                    "user_query": user_query,
                                }
                                res = requests.post("http://localhost:3000/relationship_advice", json=payload)
                                res.raise_for_status()
                                data = res.json()
                                answer = data.get("message", "No response.")
                                sources = data.get("sources", [])

                                bot_msg = st.empty()
                                full_response = ""
                                for chunk in answer:
                                    full_response += chunk
                                    bot_msg.markdown(full_response)
                                    time.sleep(0.005)

                                if sources:
                                    with st.expander("📄 Sources"):
                                        for s in sources:
                                            st.code(s)

                                st.session_state.relationship_chat_history.append({
                                    "role": "assistant",
                                    "content": answer,
                                    "sources": sources
                                })

                            except Exception as e:
                                st.error(f"Error: {e}")
                                st.session_state.relationship_chat_history.append({
                                    "role": "assistant",
                                    "content": f"⚠️ Error: {e}"
                                })



